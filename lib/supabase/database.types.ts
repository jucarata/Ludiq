export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoomStatus = "waiting" | "playing" | "finished";
export type PlayerColor = "red" | "green" | "yellow" | "blue";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          privy_user_id: string;
          wallet_address: string;
          email: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          games_played: number;
          games_won: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          privy_user_id: string;
          wallet_address: string;
          email?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          games_played?: number;
          games_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          privy_user_id?: string;
          wallet_address?: string;
          email?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          games_played?: number;
          games_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_rooms: {
        Row: {
          id: string;
          code: string;
          host_id: string | null;
          status: RoomStatus;
          max_players: number;
          winner: PlayerColor | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          host_id?: string | null;
          status?: RoomStatus;
          max_players?: number;
          winner?: PlayerColor | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          host_id?: string | null;
          status?: RoomStatus;
          max_players?: number;
          winner?: PlayerColor | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      game_room_players: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          color: PlayerColor;
          is_ready: boolean;
          is_bot: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          color: PlayerColor;
          is_ready?: boolean;
          is_bot?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          color?: PlayerColor;
          is_ready?: boolean;
          is_bot?: boolean;
          joined_at?: string;
        };
        Relationships: [];
      };
      game_states: {
        Row: {
          room_id: string;
          current_turn: PlayerColor | null;
          turn_phase: string | null;
          pieces: Json;
          remaining_dice: Json | null;
          version: number;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          current_turn?: PlayerColor | null;
          turn_phase?: string | null;
          pieces?: Json;
          remaining_dice?: Json | null;
          version?: number;
          updated_at?: string;
        };
        Update: {
          room_id?: string;
          current_turn?: PlayerColor | null;
          turn_phase?: string | null;
          pieces?: Json;
          remaining_dice?: Json | null;
          version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_moves: {
        Row: {
          id: string;
          room_id: string;
          user_id: string | null;
          move_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id?: string | null;
          move_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string | null;
          move_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_room_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      room_status: RoomStatus;
      player_color: PlayerColor;
    };
    CompositeTypes: Record<string, never>;
  };
}
