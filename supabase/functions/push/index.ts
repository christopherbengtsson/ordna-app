import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: Notification;
  schema: "public";
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface FCMErrorResponse {
  error?: {
    status?: string;
    message?: string;
    code?: number;
  };
}

console.log("Push notification function started");

// Parse service account once on cold start (not per request)
const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
if (!serviceAccountJson) {
  throw new Error("FCM_SERVICE_ACCOUNT environment variable not set");
}
const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    console.log("Received notification:", {
      id: payload.record.id,
      user_id: payload.record.user_id,
      type: payload.record.notification_type,
    });

    // Query for user's FCM token
    const { data, error } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", payload.record.user_id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!data?.fcm_token) {
      console.log("User does not have FCM token, skipping notification");
      return new Response(
        JSON.stringify({ message: "User does not have FCM token" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const fcmToken = data.fcm_token as string;

    // Get OAuth2 access token
    const accessToken = await getAccessToken({
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });

    // Build deep link URL based on action and game_id
    const deepLink = buildDeepLink(payload.record.data);

    // Prepare data payload with notification_type
    // Service worker will use this to generate localized content
    const notificationData = {
      notification_type: payload.record.notification_type,
      ...(payload.record.data || {}),
    };

    // Send FCM notification (data-only, no notification field)
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            data: Object.fromEntries(
              Object.entries(notificationData).map(([key, value]) => [
                key,
                typeof value === "string" ? value : JSON.stringify(value),
              ])
            ),
            webpush: {
              fcm_options: {
                link: deepLink,
              },
            },
          },
        }),
      }
    );

    const resData: FCMErrorResponse = await res.json();

    // Handle invalid/expired FCM tokens
    if (
      res.status === 404 ||
      resData.error?.status === "NOT_FOUND" ||
      resData.error?.status === "UNREGISTERED"
    ) {
      console.log("FCM token is invalid/expired, clearing from database");
      await supabase
        .from("profiles")
        .update({ fcm_token: null })
        .eq("id", payload.record.user_id);

      return new Response(
        JSON.stringify({
          message: "FCM token invalid/expired, cleared from database",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for other FCM errors
    if (!res.ok) {
      console.error("FCM API error:", {
        status: res.status,
        statusText: res.statusText,
        error: resData.error,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to send FCM notification",
          details: resData.error?.message || res.statusText,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Notification sent successfully:", payload.record.id);

    return new Response(JSON.stringify(resData), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing notification:", error);

    // Determine appropriate status code
    const status = error instanceof SyntaxError ? 400 : 500;

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Builds a deep link URL based on the notification action and data.
 * Maps actions to actual application routes.
 */
function buildDeepLink(data: Record<string, unknown>): string {
  const action = data?.action as string | undefined;
  const gameId = data?.game_id as string | undefined;

  if (!gameId) {
    return "/";
  }

  switch (action) {
    case "navigate_to_game":
      return `/game/${gameId}`;
    case "navigate_to_game_over":
      return `/game-over/${gameId}`;
    case "navigate_to_lobby":
      return `/lobby/${gameId}`;
    case "navigate_to_waiting_room":
      return `/waiting-room/${gameId}`;
    default:
      return `/waiting-room/${gameId}`;
  }
}

/**
 * Gets an OAuth2 access token for FCM API authentication.
 * Tokens are valid for ~1 hour and automatically refreshed by google-auth-library.
 */
const getAccessToken = ({
  clientEmail,
  privateKey,
}: {
  clientEmail: string;
  privateKey: string;
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens!.access_token!);
    });
  });
};

/* To invoke locally:

  1. Run `supabase start`

  2. Set FCM_SERVICE_ACCOUNT environment variable in .env file or via CLI:
     export FCM_SERVICE_ACCOUNT='{"client_email":"...","private_key":"...","project_id":"..."}'

  3. Create a test notification in the database (this will trigger the webhook):
     INSERT INTO notifications (user_id, notification_type, title, body, data)
     VALUES (
       'your-user-id',
       'your_turn',
       'Your Turn!',
       'It''s your turn to play',
       '{"game_id": "game-uuid", "action": "navigate_to_game"}'::jsonb
     );

  Or test directly with curl:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/push' \
    --header 'Authorization: Bearer YOUR_SERVICE_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "type": "INSERT",
      "table": "notifications",
      "record": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "user_id": "user-uuid",
        "notification_type": "your_turn",
        "title": "Your Turn!",
        "body": "It'\''s your turn to play",
        "data": {"game_id": "game-uuid", "action": "navigate_to_game"}
      },
      "schema": "public"
    }'

*/
