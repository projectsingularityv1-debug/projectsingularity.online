@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /B
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\cli\sg.js" (
  SET "_prog=%dp0%\cli\sg.js"
) ELSE (
  SET "_prog=sg.js"
)

node "%_prog%" %*
