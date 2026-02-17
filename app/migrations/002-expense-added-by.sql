ALTER TABLE expenses ADD COLUMN added_by_member_id INTEGER REFERENCES members(id);
