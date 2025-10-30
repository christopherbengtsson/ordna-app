import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateGame } from '../hooks/useCreateGame';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useProfile } from '@/common/hooks/useProfile';
import { useAuth } from '@/lib/supabase/hooks/useAuth';

interface Props {
  onGameCreated: (gameId: string) => void;
}

export function CreateGameFormContainer({ onGameCreated }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { createGame, isCreatingGame } = useCreateGame();

  const [playerName, setPlayerName] = useState(
    profile?.nickname !== 'Anonymous' ? (profile?.nickname ?? '') : '',
  );
  const [language, setLanguage] = useState('sv');
  const [minWordLength, setMinWordLength] = useState('1');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [maxMarks, setMaxMarks] = useState('3');

  const resetForm = () => {
    setPlayerName('');
    setLanguage('sv');
    setMinWordLength('1');
    setMaxPlayers('4');
    setMaxMarks('3');
  };

  const isValidForm = () => {
    if (!playerName.trim().length) {
      setPlayerName('');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidForm()) {
      toast.error('Please fill all the fields');
      return;
    }

    createGame(
      {
        p_nickname: playerName,
        p_language: language,
        p_min_word_length: Number(minWordLength),
        p_max_players: Number(maxPlayers),
        p_marks_to_eliminate: Number(maxMarks),
        p_complete_move_timeout_seconds: 86400, // 24 hours
      },
      {
        onSuccess: ({ game_id }) => {
          toast.success('Game created successfully!');
          resetForm();
          onGameCreated(game_id);
        },
        onError: (error) => {
          toast.error(`Failed to create game: ${error.message}`);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className={cn('grid gap-4')}>
      <div className="grid gap-2">
        <Label htmlFor="playerName">Your Nickname</Label>
        <Input
          id="playerName"
          placeholder="Enter your nickname"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="min-h-11"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="language">Language</Label>
        <Select value={language} onValueChange={setLanguage} required>
          <SelectTrigger id="language" className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sv">Swedish</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="maxPlayers">Maximum Players</Label>
        <Input
          id="maxPlayers"
          type="number"
          min="2"
          max="12"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          className="min-h-11"
          required
        />
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>More settings</AccordionTrigger>
          <AccordionContent className={cn('grid gap-4')}>
            <div className="grid gap-2">
              <Label htmlFor="minWordLength">Minimum Word Length</Label>
              <Input
                id="minWordLength"
                type="number"
                min="0"
                value={minWordLength}
                onChange={(e) => setMinWordLength(e.target.value)}
                className="min-h-11"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxMarks">Number of rounds</Label>
              <Input
                id="maxMarks"
                type="number"
                min="1"
                max="5"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="min-h-11"
                required
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button
        type="submit"
        className="w-full min-h-11 md:min-h-12"
        disabled={isCreatingGame || !playerName}
      >
        {isCreatingGame ? 'Creating...' : 'Create Game'}
      </Button>
    </form>
  );
}
