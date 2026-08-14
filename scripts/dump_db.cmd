@echo off
rem  Full logical backup of the Supabase database -- Windows counterpart of
rem  dump_db.sh. Both write the same three files in the same order.
rem
rem  The dump is split into three files because that is the only order in which
rem  it can be restored: roles own the objects, the schema needs its owners to
rem  exist, and the data needs its tables.
rem
rem    scripts\dump_db.cmd                     REM env var, else .env.local
rem    scripts\dump_db.cmd --local             REM local `supabase start`
rem    scripts\dump_db.cmd --out backups\before-rename
rem    scripts\dump_db.cmd --schema public     REM public only, no accounts
rem
rem  Restore into an empty database, in this order:
rem
rem    psql "%SUPABASE_DB_URL%" -f roles.sql
rem    psql "%SUPABASE_DB_URL%" -f schema.sql
rem    psql "%SUPABASE_DB_URL%" -f data.sql
rem
rem  Requires the Supabase CLI. It runs pg_dump in a container matching the
rem  server version, which avoids the "server version mismatch" abort of a
rem  locally installed pg_dump.

setlocal EnableExtensions

rem  Delayed expansion stays OFF on purpose: it would eat "!" in the password.

rem  `auth` carries the user accounts including app_metadata, which is where
rem  this app reads roles from (see src\lib\roles.ts). Dumping `public` alone
rem  yields tours whose invites reference accounts that no longer exist.
set "SCHEMAS=public,auth"
set "DBURL=%SUPABASE_DB_URL%"
set "LOCAL="
set "OUT="

:parse
if "%~1"=="" goto parsed
if /i "%~1"=="--local"  goto opt_local
if /i "%~1"=="--db-url" goto opt_dburl
if /i "%~1"=="--schema" goto opt_schema
if /i "%~1"=="--out"    goto opt_out
if /i "%~1"=="--help"   goto usage
if /i "%~1"=="-h"       goto usage
if /i "%~1"=="/?"       goto usage
echo unknown argument: %~1 1>&2
exit /b 2

:opt_local
set "LOCAL=1"
shift
goto parse

:opt_dburl
set "DBURL=%~2"
set "LOCAL="
shift
shift
goto parse

:opt_schema
set "SCHEMAS=%~2"
shift
shift
goto parse

:opt_out
set "OUT=%~2"
shift
shift
goto parse

:parsed
rem  Precedence: --db-url / --local, then the environment, then .env.local.
if defined LOCAL goto have_target
if defined DBURL goto have_target

rem  Only this one key is read. Loading the whole file would also drag
rem  SUPABASE_SERVICE_ROLE_KEY into the environment of everything below.
set "ENVFILE=%~dp0..\.env.local"
if not exist "%ENVFILE%" goto no_url
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENVFILE%") do if /i "%%A"=="SUPABASE_DB_URL" set "DBURL=%%B"
if not defined DBURL goto no_url
rem  %~1 drops one layer of surrounding quotes; an unquoted value is unchanged.
call :strip_quotes %DBURL%
goto have_target

:no_url
echo No database URL. Add a line to .env.local: 1>&2
echo   SUPABASE_DB_URL=postgresql://postgres.^<ref^>:^<password^>@^<host^>:5432/postgres 1>&2
echo Dashboard -^> Connect -^> Session pooler (URI, port 5432). 1>&2
echo Or pass --db-url ^<url^> / --local. 1>&2
exit /b 2

:have_target
where supabase >nul 2>nul
if errorlevel 1 (
  echo supabase CLI not found in PATH 1>&2
  exit /b 127
)

rem  %DATE% is locale-dependent and unusable for sortable folder names.
set "STAMP="
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"`) do set "STAMP=%%T"
if not defined STAMP set "STAMP=manual"
rem  Default target sits next to the repo, not next to the current directory,
rem  so a double-click from Explorer does not scatter dumps into system32.
if not defined OUT set "OUT=%~dp0..\backups\%STAMP%"
if not exist "%OUT%" mkdir "%OUT%"

rem  Roles are cluster-wide and not covered by a schema dump.
echo [1/3] roles
call :dump --role-only -f "%OUT%\roles.sql"
if errorlevel 1 goto fail

echo [2/3] schema (%SCHEMAS%)
call :dump --schema "%SCHEMAS%" -f "%OUT%\schema.sql"
if errorlevel 1 goto fail

rem  --use-copy: COPY instead of one INSERT per row. Faster to restore and,
rem  unlike INSERT, it does not silently reorder identity columns.
echo [3/3] data (%SCHEMAS%)
call :dump --schema "%SCHEMAS%" --data-only --use-copy -f "%OUT%\data.sql"
if errorlevel 1 goto fail

echo.
echo Dump written to %OUT%
dir /b "%OUT%"
echo.
echo This dump contains personal data and password hashes. Keep it out of git
echo and off shared storage; backups\ is gitignored.
call :pause_if_double_clicked
exit /b 0

:fail
echo.
echo Dump FAILED -- "%OUT%" is incomplete, do not restore from it. 1>&2
call :pause_if_double_clicked
exit /b 1

rem  Quoting the URL keeps "&" in the password from splitting the command line.
:dump
if defined LOCAL (
  supabase db dump --local %*
) else (
  supabase db dump --db-url "%DBURL%" %*
)
exit /b %errorlevel%

:strip_quotes
set "DBURL=%~1"
exit /b 0

:pause_if_double_clicked
echo(%cmdcmdline%| find /i "/c" >nul && pause
exit /b 0

:usage
echo Full logical backup of the Supabase database.
echo.
echo   scripts\dump_db.cmd                    %%SUPABASE_DB_URL%%, else .env.local
echo   scripts\dump_db.cmd --local            local `supabase start` instance
echo   scripts\dump_db.cmd --db-url ^<url^>
echo   scripts\dump_db.cmd --schema public    public only, no accounts
echo   scripts\dump_db.cmd --out ^<folder^>     default: backups\^<date^>_^<time^>
echo.
echo Writes roles.sql, schema.sql and data.sql. Restore in that order:
echo   psql "%%SUPABASE_DB_URL%%" -f roles.sql
echo   psql "%%SUPABASE_DB_URL%%" -f schema.sql
echo   psql "%%SUPABASE_DB_URL%%" -f data.sql
exit /b 0
