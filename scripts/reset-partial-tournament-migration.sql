/* ════════════════════════════════════════════════════════════════════════════
   One-shot recovery script for a partially-applied AddTournamentsAndCaptain
   migration. Use after the FK_Teams_AspNetUsers_CaptainUserId failure to wipe
   the partial state so the regenerated migration can re-apply cleanly.

   Safe to run repeatedly (every drop is guarded). Wipes only the tables /
   columns / indexes introduced by that migration — your Apartments, Teams,
   Seasons, Games, AppUsers and their data are untouched.

   Run in SSMS / Azure Data Studio against the `epldb` database (local).
   ════════════════════════════════════════════════════════════════════════════ */

USE epldb;
GO

-- 1. Drop the FK if it half-formed (the failure was creating it, so likely absent,
--    but guard anyway so re-runs are safe).
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Teams_AspNetUsers_CaptainUserId')
    ALTER TABLE Teams DROP CONSTRAINT FK_Teams_AspNetUsers_CaptainUserId;
GO

-- 2. Drop the child tables (TournamentCategories has FK -> Tournaments so drop it first).
DROP TABLE IF EXISTS TournamentCategories;
DROP TABLE IF EXISTS Tournaments;
DROP TABLE IF EXISTS TeamMembers;
GO

-- 3. Drop the index on Teams.CaptainUserId (must go before the column drop).
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Teams_CaptainUserId' AND object_id = OBJECT_ID('Teams'))
    DROP INDEX IX_Teams_CaptainUserId ON Teams;
GO

-- 4. Drop the Teams.CaptainUserId column.
IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'CaptainUserId' AND object_id = OBJECT_ID('Teams'))
    ALTER TABLE Teams DROP COLUMN CaptainUserId;
GO

-- 5. EF didn't write a history row for the failed migration, but check anyway
--    (so this script is safe even if someone manually inserted one).
DELETE FROM __EFMigrationsHistory
 WHERE MigrationId LIKE '%_AddTournamentsAndCaptain';
GO

PRINT 'Partial migration state cleared. You can restart the API now.';
