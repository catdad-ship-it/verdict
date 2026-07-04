-- The list_items RLS policy only checked auth.uid() = user_id, not that
-- list_id actually belongs to the caller. Share URLs expose list UUIDs
-- publicly and the anon key ships in the client bundle, so anyone could hit
-- Supabase REST directly and insert (or move) rows into another user's list.
DROP POLICY IF EXISTS "Users manage their own list items" ON list_items;

CREATE POLICY "Users manage their own list items"
  ON list_items FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND lists.user_id = auth.uid())
  );
