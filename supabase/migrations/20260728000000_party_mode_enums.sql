-- Add party room mode + open pot status (must commit before use).

alter type public.room_mode add value if not exists 'party';
alter type public.pot_status add value if not exists 'open';
