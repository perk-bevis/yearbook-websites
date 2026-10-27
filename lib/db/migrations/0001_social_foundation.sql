-- Additive social schema upgrade. Keeps the existing friendship requests and
-- group-chat rows intact while extending them for the yearbook community.
BEGIN;

CREATE TABLE IF NOT EXISTS cohorts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2200),
    school_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cohorts_school_academic_year_key UNIQUE (school_name, academic_year),
    CONSTRAINT cohorts_name_year_key UNIQUE (name, year)
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT classes_cohort_id_name_key UNIQUE (cohort_id, name)
);

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) NOT NULL DEFAULT 'everyone';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_profile_visibility_check') THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_profile_visibility_check
            CHECK (profile_visibility IN ('everyone', 'cohort', 'friends'));
    END IF;
END $$;

ALTER TABLE friendships
    ADD COLUMN IF NOT EXISTS requester_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS addressee_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'accepted';

UPDATE friendships
SET requester_id = COALESCE(requester_id, user_a),
    addressee_id = COALESCE(addressee_id, user_b)
WHERE requester_id IS NULL OR addressee_id IS NULL;

ALTER TABLE friendships
    ALTER COLUMN requester_id SET NOT NULL,
    ALTER COLUMN addressee_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_requester_addressee_key') THEN
        ALTER TABLE friendships ADD CONSTRAINT friendships_requester_addressee_key
            UNIQUE (requester_id, addressee_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_status_check') THEN
        ALTER TABLE friendships ADD CONSTRAINT friendships_status_check
            CHECK (status IN ('pending', 'accepted', 'declined'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_no_self_check') THEN
        ALTER TABLE friendships ADD CONSTRAINT friendships_no_self_check
            CHECK (requester_id <> addressee_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_friendships_status_created
    ON friendships (status, created_at DESC);

INSERT INTO friendships (user_a, user_b, requester_id, addressee_id, status, created_at)
SELECT LEAST(fr.sender_id, fr.receiver_id),
       GREATEST(fr.sender_id, fr.receiver_id),
       fr.sender_id,
       fr.receiver_id,
       CASE
           WHEN fr.status = 'accepted' THEN 'accepted'
           WHEN fr.status IN ('rejected', 'declined') THEN 'declined'
           ELSE 'pending'
       END,
       COALESCE(fr.created_at, NOW())
FROM friend_requests fr
ON CONFLICT (user_a, user_b) DO UPDATE
SET requester_id = EXCLUDED.requester_id,
    addressee_id = EXCLUDED.addressee_id,
    status = EXCLUDED.status
WHERE friendships.status <> 'accepted' OR EXCLUDED.status = 'accepted';

ALTER TABLE group_conversations
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) NOT NULL DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS invite_token TEXT;

UPDATE group_conversations
SET owner_id = created_by
WHERE owner_id IS NULL AND created_by <> 'system:default';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_conversations_privacy_check') THEN
        ALTER TABLE group_conversations ADD CONSTRAINT group_conversations_privacy_check
            CHECK (privacy IN ('public', 'private'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_default_cohort
    ON group_conversations (cohort_id)
    WHERE is_default = TRUE AND cohort_id IS NOT NULL AND class_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_default_class
    ON group_conversations (class_id)
    WHERE is_default = TRUE AND class_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_invite_token
    ON group_conversations (invite_token)
    WHERE invite_token IS NOT NULL;

ALTER TABLE group_members
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member',
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'joined';

UPDATE group_members gm
SET role = 'owner'
FROM group_conversations g
WHERE gm.group_id = g.id AND gm.user_id = g.created_by;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_role_check') THEN
        ALTER TABLE group_members ADD CONSTRAINT group_members_role_check
            CHECK (role IN ('owner', 'admin', 'member'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_status_check') THEN
        ALTER TABLE group_members ADD CONSTRAINT group_members_status_check
            CHECK (status IN ('invited', 'requested', 'joined'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS group_posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
    author_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_posts_newest
    ON group_posts (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    reported_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    reason VARCHAR(80) NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (reporter_id <> reported_id)
);
CREATE INDEX IF NOT EXISTS idx_user_reports_status_created
    ON user_reports (status, created_at DESC);

-- The current database already has group_conversations and group_messages.
-- Expose the richer group entity under the requested name without moving
-- message history or breaking existing API queries.
CREATE OR REPLACE VIEW "groups" AS
SELECT id, name, description, cohort_id, class_id, owner_id, privacy,
       created_at, is_default, invite_token
FROM group_conversations;

-- Create sample cohorts/classes from real yearbook records, not synthetic
-- user accounts. Existing profile text is preserved and linked only when the
-- school/class combination identifies exactly one cohort.
INSERT INTO cohorts (name, year, school_name, academic_year)
SELECT DISTINCT y.school_name || ' · ' || y.academic_year,
       substring(y.academic_year FROM '[0-9]{4}$')::INTEGER,
       y.school_name,
       y.academic_year
FROM yearbooks y
WHERE y.academic_year ~ '[0-9]{4}$'
ON CONFLICT (school_name, academic_year) DO NOTHING;

INSERT INTO classes (cohort_id, name)
SELECT DISTINCT c.id,
       regexp_replace(btrim(y.class_name), '^Lớp[[:space:]]*', '', 'i')
FROM yearbooks y
JOIN cohorts c
  ON c.school_name = y.school_name AND c.academic_year = y.academic_year
WHERE btrim(y.class_name) <> ''
ON CONFLICT (cohort_id, name) DO NOTHING;

WITH candidates AS (
    SELECT au.id AS app_user_id, c.id AS cohort_id, cl.id AS class_id,
           COUNT(*) OVER (PARTITION BY au.id) AS match_count
    FROM app_users au
    JOIN cohorts c
      ON lower(btrim(au.school_name)) = lower(btrim(c.school_name))
    JOIN classes cl
      ON cl.cohort_id = c.id
     AND lower(regexp_replace(btrim(au.class_name), '^Lớp[[:space:]]*', '', 'i')) = lower(cl.name)
    WHERE COALESCE(btrim(au.school_name), '') <> ''
      AND COALESCE(btrim(au.class_name), '') <> ''
)
UPDATE app_users au
SET cohort_id = matches.cohort_id,
    class_id = matches.class_id
FROM candidates matches
WHERE au.id = matches.app_user_id
  AND matches.match_count = 1
  AND au.cohort_id IS NULL
  AND au.class_id IS NULL;

INSERT INTO group_conversations
    (name, created_by, description, cohort_id, owner_id, privacy, is_default)
SELECT left('Khóa · ' || c.name, 120),
       'system:default',
       'Nhóm kết nối thành viên cùng khóa.',
       c.id,
       NULL,
       'public',
       TRUE
FROM cohorts c
WHERE NOT EXISTS (
    SELECT 1 FROM group_conversations g
    WHERE g.is_default = TRUE AND g.cohort_id = c.id AND g.class_id IS NULL
);

INSERT INTO group_conversations
    (name, created_by, description, cohort_id, class_id, owner_id, privacy, is_default)
SELECT left(cl.name || ' · ' || c.name, 120),
       'system:default',
       'Nhóm kết nối thành viên cùng lớp.',
       c.id,
       cl.id,
       NULL,
       'public',
       TRUE
FROM classes cl
JOIN cohorts c ON c.id = cl.cohort_id
WHERE NOT EXISTS (
    SELECT 1 FROM group_conversations g
    WHERE g.is_default = TRUE AND g.class_id = cl.id
);

INSERT INTO group_members (group_id, user_id, role, status)
SELECT g.id, au.clerk_user_id, 'member', 'joined'
FROM app_users au
JOIN group_conversations g ON g.is_default = TRUE AND g.cohort_id = au.cohort_id
WHERE au.cohort_id IS NOT NULL AND g.class_id IS NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO group_members (group_id, user_id, role, status)
SELECT g.id, au.clerk_user_id, 'member', 'joined'
FROM app_users au
JOIN group_conversations g ON g.is_default = TRUE AND g.class_id = au.class_id
WHERE au.class_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

COMMIT;
