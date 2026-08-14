#!/usr/bin/env pwsh
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir/cli/sg.js" @args
