export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoomStatus = "waiting" | "playing" | "finished";
export type RoomMode = "free" | "party" | "competitive";
export type PotStatus =
  | "none"
  | "open"
  | "funded"
  | "locked"
  | "settled"
  | "refunded";
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
          trophies: number;
          koins: number;
          tutorial_completed: boolean;
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
          trophies?: number;
          koins?: number;
          tutorial_completed?: boolean;
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
          trophies?: number;
          koins?: number;
          tutorial_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_rooms: {
        Row: {
          id: string;
          code: string;
          mode: RoomMode;
          host_id: string | null;
          status: RoomStatus;
          max_players: number;
          winner: PlayerColor | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
          escrow_room_key: string | null;
          pot_amount_usdt: number;
          pot_status: PotStatus;
          open_tx_hash: string | null;
          refund_tx_hash: string | null;
          payout_tx_hash: string | null;
          trophies_awarded: number | null;
        };
        Insert: {
          id?: string;
          code: string;
          mode?: RoomMode;
          host_id?: string | null;
          status?: RoomStatus;
          max_players?: number;
          winner?: PlayerColor | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
          escrow_room_key?: string | null;
          pot_amount_usdt?: number;
          pot_status?: PotStatus;
          open_tx_hash?: string | null;
          refund_tx_hash?: string | null;
          payout_tx_hash?: string | null;
          trophies_awarded?: number | null;
        };
        Update: {
          id?: string;
          code?: string;
          mode?: RoomMode;
          host_id?: string | null;
          status?: RoomStatus;
          max_players?: number;
          winner?: PlayerColor | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
          escrow_room_key?: string | null;
          pot_amount_usdt?: number;
          pot_status?: PotStatus;
          open_tx_hash?: string | null;
          refund_tx_hash?: string | null;
          payout_tx_hash?: string | null;
          trophies_awarded?: number | null;
        };
        Relationships: [];
      };
      game_room_players: {
        Row: {
          id: string;
          room_id: string;
          user_id: string | null;
          guest_name: string | null;
          guest_session_id: string | null;
          color: PlayerColor;
          is_ready: boolean;
          is_bot: boolean;
          auto_enabled: boolean;
          joined_at: string;
          entry_paid: boolean;
          entry_tx_hash: string | null;
          contributed_pool_usdt: number;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id?: string | null;
          guest_name?: string | null;
          guest_session_id?: string | null;
          color: PlayerColor;
          is_ready?: boolean;
          is_bot?: boolean;
          auto_enabled?: boolean;
          joined_at?: string;
          entry_paid?: boolean;
          entry_tx_hash?: string | null;
          contributed_pool_usdt?: number;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string | null;
          guest_name?: string | null;
          guest_session_id?: string | null;
          color?: PlayerColor;
          is_ready?: boolean;
          is_bot?: boolean;
          auto_enabled?: boolean;
          joined_at?: string;
          entry_paid?: boolean;
          entry_tx_hash?: string | null;
          contributed_pool_usdt?: number;
        };
        Relationships: [];
      };
      game_room_contributions: {
        Row: {
          id: string;
          room_id: string;
          player_id: string | null;
          wallet_address: string;
          pool_amount_usdt: number;
          fee_amount_usdt: number;
          tx_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id?: string | null;
          wallet_address: string;
          pool_amount_usdt: number;
          fee_amount_usdt: number;
          tx_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string | null;
          wallet_address?: string;
          pool_amount_usdt?: number;
          fee_amount_usdt?: number;
          tx_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      game_room_bans: {
        Row: {
          id: string;
          room_id: string;
          user_id: string | null;
          guest_session_id: string | null;
          banned_at: string;
          banned_by: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          banned_at?: string;
          banned_by?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          banned_at?: string;
          banned_by?: string | null;
        };
        Relationships: [];
      };
      shop_offers: {
        Row: {
          id: string;
          slug: string;
          koins: number;
          price_usdt: number;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          koins: number;
          price_usdt: number;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          koins?: number;
          price_usdt?: number;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      koin_purchases: {
        Row: {
          id: string;
          profile_id: string;
          offer_id: string;
          koins: number;
          price_usdt: number;
          tx_hash: string;
          buyer_wallet: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          offer_id: string;
          koins: number;
          price_usdt: number;
          tx_hash: string;
          buyer_wallet: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          offer_id?: string;
          koins?: number;
          price_usdt?: number;
          tx_hash?: string;
          buyer_wallet?: string;
          created_at?: string;
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
          active_players: Json;
          exit_roll_attempts: number;
          last_roll: Json | null;
          last_action: string | null;
          action_id: string | null;
          winner: PlayerColor | null;
          turn_started_at: string;
          afk_takeover: boolean;
          version: number;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          current_turn?: PlayerColor | null;
          turn_phase?: string | null;
          pieces?: Json;
          remaining_dice?: Json | null;
          active_players?: Json;
          exit_roll_attempts?: number;
          last_roll?: Json | null;
          last_action?: string | null;
          action_id?: string | null;
          winner?: PlayerColor | null;
          turn_started_at?: string;
          afk_takeover?: boolean;
          version?: number;
          updated_at?: string;
        };
        Update: {
          room_id?: string;
          current_turn?: PlayerColor | null;
          turn_phase?: string | null;
          pieces?: Json;
          remaining_dice?: Json | null;
          active_players?: Json;
          exit_roll_attempts?: number;
          last_roll?: Json | null;
          last_action?: string | null;
          action_id?: string | null;
          winner?: PlayerColor | null;
          turn_started_at?: string;
          afk_takeover?: boolean;
          version?: number;
          updated_at?: string;
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
      award_profile_trophies: {
        Args: {
          p_profile_id: string;
          p_amount: number;
        };
        Returns: number;
      };
      adjust_profile_koins: {
        Args: {
          p_profile_id: string;
          p_delta: number;
        };
        Returns: number;
      };
    };
    Enums: {
      room_status: RoomStatus;
      player_color: PlayerColor;
    };
    CompositeTypes: Record<string, never>;
  };
}
