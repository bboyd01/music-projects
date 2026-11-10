-- Music Projects — Render region and upload
-- Renders the region under the edit cursor and uploads it to the track with the same name
-- as this REAPER project (e.g. "New Sketch 14.rpp" → track "New Sketch 14").
--
-- Setup (once):
--   1. Actions → Show action list → New action → Load ReaScript… → pick this file.
--   2. File → Render…: set the format to MP3 (or WAV) and close. The script reuses that format
--      (set it in your project template so new projects have it too).
--   3. Run the script. The first time it asks for your server address and API token
--      (Music Projects → Settings → API & REAPER → Create token).
-- Use: put the edit cursor inside a region and run it.

local SECTION = "MusicProjects"

local function msg(text, title)
  reaper.ShowMessageBox(text, title or "Music Projects", 0)
end

-- ── Settings (server + token), remembered between sessions ─────────────────
local function ask_settings()
  local server = reaper.GetExtState(SECTION, "server")
  local ok, csv = reaper.GetUserInputs("Music Projects — connect", 2,
    "Server address (https://…),API token (mp_…),extrawidth=260", server .. ",")
  if not ok then return nil end
  local s, t = csv:match("^([^,]*),([^,]*)$")
  s = (s or ""):gsub("%s+", ""):gsub("/+$", "")
  t = (t or ""):gsub("%s+", "")
  if not s:match("^https?://") or not t:match("^mp_") then
    msg("Enter the full server address (https://…) and an API token starting with mp_.")
    return nil
  end
  reaper.SetExtState(SECTION, "server", s, true)
  reaper.SetExtState(SECTION, "token", t, true)
  return s, t
end

local function settings()
  local s, t = reaper.GetExtState(SECTION, "server"), reaper.GetExtState(SECTION, "token")
  if s == "" or t == "" then return ask_settings() end
  return s, t
end

-- ── Helpers ───────────────────────────────────────────────────────────────
local function urlencode(str)
  return (str:gsub("[^%w%-%._~]", function(c) return string.format("%%%02X", c:byte()) end))
end

local is_windows = reaper.GetOS():match("^Win") ~= nil

local function shell_quote(str)
  if is_windows then return '"' .. str:gsub('"', '\\"') .. '"' end
  return "'" .. str:gsub("'", "'\\''") .. "'"
end

local function dirname(path)
  return path:match("^(.*)[/\\][^/\\]*$") or "."
end

-- RENDER_FORMAT is base64; its first 4 decoded bytes name the format ("l3pm" = MP3, "evaw" = WAV).
local function format_code(b64)
  local chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  local bits, out = "", {}
  for i = 1, math.min(#b64, 8) do
    local idx = chars:find(b64:sub(i, i), 1, true)
    if not idx then break end
    local v = idx - 1
    for b = 5, 0, -1 do bits = bits .. (((v >> b) & 1 == 1) and "1" or "0") end
  end
  for i = 1, #bits - 7, 8 do out[#out + 1] = string.char(tonumber(bits:sub(i, i + 7), 2)) end
  return table.concat(out):sub(1, 4)
end

-- Region under the edit cursor (or the only region in the project).
local function current_region()
  local _, idx = reaper.GetLastMarkerAndCurRegion(0, reaper.GetCursorPosition())
  if idx and idx >= 0 then
    local _, isrgn, pos, rgnend, name = reaper.EnumProjectMarkers(idx)
    if isrgn then return pos, rgnend, name end
  end
  local _, _, num_regions = reaper.CountProjectMarkers(0)
  if num_regions == 1 then
    local i = 0
    while true do
      local ret, isrgn, pos, rgnend, name = reaper.EnumProjectMarkers(i)
      if ret == 0 then break end
      if isrgn then return pos, rgnend, name end
      i = i + 1
    end
  end
  return nil
end

-- ── Main ──────────────────────────────────────────────────────────────────
local function main()
  local _, project_file = reaper.EnumProjects(-1)
  local project_name = reaper.GetProjectName(0):gsub("%.[Rr][Pp][Pp]%-?[%w]*$", "")
  if project_file == "" or project_name == "" then
    msg("Save the project first: its name is used to find the track.")
    return
  end

  local start_pos, end_pos = current_region()
  if not start_pos then
    msg("Put the edit cursor inside a region, then run this again.")
    return
  end

  -- The render format comes from your render settings; it must be MP3 or WAV.
  local _, format = reaper.GetSetProjectInfo_String(0, "RENDER_FORMAT", "", false)
  local fourcc = format_code(format)
  local ext, ctype
  if fourcc == "l3pm" then ext, ctype = "mp3", "audio/mpeg"
  elseif fourcc == "evaw" then ext, ctype = "wav", "audio/wav"
  else
    msg("Set the render format to MP3 (or WAV) in File → Render… once, then run this again.")
    return
  end

  local server, token = settings()
  if not server then return end

  local out_dir = dirname(project_file) .. "/Renders"
  local out_file = out_dir .. "/" .. project_name .. "." .. ext
  reaper.RecursiveCreateDirectory(out_dir, 0)
  os.remove(out_file) -- avoid REAPER's overwrite prompt

  -- Remember settings we change so the project is left as it was.
  local _, old_file = reaper.GetSetProjectInfo_String(0, "RENDER_FILE", "", false)
  local _, old_pattern = reaper.GetSetProjectInfo_String(0, "RENDER_PATTERN", "", false)
  local old_bounds = reaper.GetSetProjectInfo(0, "RENDER_BOUNDSFLAG", 0, false)
  local old_start, old_end = reaper.GetSet_LoopTimeRange(false, false, 0, 0, false)

  reaper.PreventUIRefresh(1)
  reaper.GetSet_LoopTimeRange(true, false, start_pos, end_pos, false)
  reaper.GetSetProjectInfo(0, "RENDER_BOUNDSFLAG", 2, true) -- 2 = time selection
  reaper.GetSetProjectInfo_String(0, "RENDER_FILE", out_dir, true)
  reaper.GetSetProjectInfo_String(0, "RENDER_PATTERN", project_name, true)
  reaper.Main_OnCommand(42230, 0) -- Render using most recent settings, auto-close dialog

  reaper.GetSetProjectInfo_String(0, "RENDER_FILE", old_file, true)
  reaper.GetSetProjectInfo_String(0, "RENDER_PATTERN", old_pattern, true)
  reaper.GetSetProjectInfo(0, "RENDER_BOUNDSFLAG", old_bounds, true)
  reaper.GetSet_LoopTimeRange(true, false, old_start, old_end, false)
  reaper.PreventUIRefresh(-1)

  if not reaper.file_exists(out_file) then
    msg("Rendering didn’t produce " .. out_file .. "\nCheck the render settings and try again.")
    return
  end

  local url = server .. "/api/v1/audio?filename=" .. urlencode(project_name .. "." .. ext)
  local cmd = table.concat({
    "curl -sS -w " .. shell_quote("\\n%{http_code}"), -- curl expands \n itself
    "-X POST",
    "-H " .. shell_quote("Authorization: Bearer " .. token),
    "-H " .. shell_quote("Content-Type: " .. ctype),
    "--data-binary @" .. shell_quote(out_file),
    shell_quote(url)
  }, " ")
  local result = reaper.ExecProcess(cmd, 0)
  if not result then
    msg("Couldn’t run curl to upload the file.")
    return
  end
  -- ExecProcess returns "<exit code>\n<output>"; curl's output ends with the HTTP status.
  local output = result:gsub("^%-?%d+\n", "")
  local status = tonumber(output:match("(%d%d%d)%s*$") or "")
  local body = output:gsub("%d%d%d%s*$", "")

  if status == 200 then
    local project = body:match('"project":%s*{[^}]-"name":%s*"(.-)"') or "?"
    local track = body:match('"track":%s*{[^}]-"title":%s*"(.-)"') or project_name
    msg("Uploaded " .. project_name .. "." .. ext .. "\n" .. project .. " → " .. track, "Music Projects — uploaded")
  else
    local why = body:match('"message":%s*"(.-)"') or body
    if status == 401 then
      reaper.DeleteExtState(SECTION, "token", true)
      why = why .. "\n\nThe API token was rejected. Run the script again to enter a new one."
    end
    msg("Upload failed (" .. tostring(status or "no response") .. "):\n" .. why, "Music Projects — upload failed")
  end
end

main()
