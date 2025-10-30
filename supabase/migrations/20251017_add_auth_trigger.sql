  -- Drop trigger if exists (idempotent)
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  -- Create trigger on auth.users
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.__handle_new_user();
