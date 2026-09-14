-- X23 HUB — LEGACY PC LOADER — Compatible con: Synapse X, KRNL, Fluxus, Solara, Delta, Xeno, Script-Ware
-- Captura todos los globales ANTES de cualquier restricción de entorno (compatible con ofuscadores)

local _game         = game
local _Instance     = Instance
local _task         = task
local _pcall        = pcall
local _tostring     = tostring
local _type         = type
local _print        = print
local _loadstring   = loadstring

-- APIs del executor — capturadas antes de cualquier _ENV override
local _syn          = (typeof(syn)     == "table"    and syn)     or nil
local _request      = (typeof(request) == "function" and request) or nil
local _http         = (typeof(http)    == "table"    and http)    or nil
local _genv         = (typeof(getgenv) == "function" and getgenv()) or nil

local HttpService   = _game:GetService("HttpService")
local Players       = _game:GetService("Players")
local TeleportService = _game:GetService("TeleportService")
local player        = Players.LocalPlayer
local playerGui     = player.PlayerGui
local Color3        = Color3
local UDim2         = UDim2
local UDim          = UDim
local Enum          = Enum

local API_URL = "https://0df0d4ce-f84e-423b-971d-a243eea7e01f-00-1pzapgoozo9mk.picard.replit.dev/api/keys/validate"
local HUB_URL = "https://raw.githubusercontent.com/lxpzdylib41-web/code-tapex/main/x23hub.lua"
local PRODUCT_ID = "legacy"
local KEY_FILE = "X23Hub_Legacy.key"

-- El servidor siempre decide si la key sigue vigente. Este intervalo solo limita
-- cuánto puede tardar el loader en reaccionar a una expiración o revocación.
local CHECK_INTERVAL = 15

-- ── Persistencia de la key (sin guardar fechas locales) ───────
-- La key se guarda solo como comodidad. En cada ejecución se valida otra vez
-- contra el servidor, por lo que el archivo nunca puede extender la duración.
local _isfile    = (typeof(isfile) == "function" and isfile) or nil
local _readfile  = (typeof(readfile) == "function" and readfile) or nil
local _writefile = (typeof(writefile) == "function" and writefile) or nil
local _delfile   = (typeof(delfile) == "function" and delfile) or nil

local function loadSavedKey()
    if _isfile and _readfile then
        local existsOk, exists = _pcall(_isfile, KEY_FILE)
        if existsOk and exists then
            local readOk, value = _pcall(_readfile, KEY_FILE)
            if readOk and _type(value) == "string" then
                local saved = value:match("^%s*(.-)%s*$")
                if saved ~= "" then return saved end
            end
        end
    end
    if _genv and _type(_genv.X23LegacyKey) == "string" and _genv.X23LegacyKey ~= "" then
        return _genv.X23LegacyKey
    end
    return nil
end

local function saveKey(key)
    if _writefile then
        local ok = _pcall(_writefile, KEY_FILE, key)
        if ok then return true end
    end
    if _genv then
        _genv.X23LegacyKey = key
        return true
    end
    return false
end

local function clearSavedKey()
    if _delfile and _isfile then
        local existsOk, exists = _pcall(_isfile, KEY_FILE)
        if existsOk and exists then _pcall(_delfile, KEY_FILE) end
    end
    if _genv then _genv.X23LegacyKey = nil end
end

-- ── Detección de HWID compatible con todos los executors ─────
local function getHWID()
    -- Synapse X
    if _syn and _type(_syn.fingerprint) == "function" then
        local ok, v = _pcall(_syn.fingerprint)
        if ok and v and v ~= "" then return _tostring(v) end
    end
    -- KRNL / varios
    if typeof(gethwid) == "function" then
        local ok, v = _pcall(gethwid)
        if ok and v and v ~= "" then return _tostring(v) end
    end
    -- Fluxus / otros
    if typeof(getfingerprint) == "function" then
        local ok, v = _pcall(getfingerprint)
        if ok and v and v ~= "" then return _tostring(v) end
    end
    -- getgenv fallback
    if _genv then
        if _type(_genv.gethwid) == "function" then
            local ok, v = _pcall(_genv.gethwid)
            if ok and v and v ~= "" then return _tostring(v) end
        end
        if _type(_genv.getfingerprint) == "function" then
            local ok, v = _pcall(_genv.getfingerprint)
            if ok and v and v ~= "" then return _tostring(v) end
        end
    end
    -- Último fallback: ID único del cliente Roblox (no es HWID real pero es único por instalación)
    local ok, v = _pcall(function()
        return _game:GetService("RbxAnalyticsService"):GetClientId()
    end)
    if ok and v and v ~= "" then return _tostring(v) end
    return "UNKNOWN"
end

-- ── HTTP compatible con todos los executors ───────────────────
local function httpPost(url, body)
    local encoded = HttpService:JSONEncode(body)
    local headers = { ["Content-Type"] = "application/json" }
    local opts    = { Url = url, Method = "POST", Headers = headers, Body = encoded }

    if _syn and _syn.request then return _syn.request(opts) end
    local _req = _request or (_genv and _genv.request)
    if _req then return _req(opts) end
    local _h = _http or (_genv and _genv.http)
    if _h and _h.request then return _h.request(opts) end
    return HttpService:RequestAsync(opts)
end

-- ── Pantalla de key expirada / revocada ──────────────────────
local function showExpiredScreen(reason)
    clearSavedKey()
    for _, v in pairs(playerGui:GetChildren()) do
        if v.Name ~= "X23ExpiredScreen" then
            _pcall(function() v:Destroy() end)
        end
    end

    local expGui = _Instance.new("ScreenGui")
    expGui.Name = "X23ExpiredScreen"
    expGui.ResetOnSpawn = false
    expGui.DisplayOrder = 9999
    expGui.Parent = playerGui

    local bg = _Instance.new("Frame")
    bg.Size = UDim2.new(1, 0, 1, 0)
    bg.BackgroundColor3 = Color3.fromRGB(5, 5, 8)
    bg.BackgroundTransparency = 0
    bg.BorderSizePixel = 0
    bg.Parent = expGui

    local win = _Instance.new("Frame")
    win.Size = UDim2.new(0, 360, 0, 200)
    win.Position = UDim2.new(0.5, -180, 0.5, -100)
    win.BackgroundColor3 = Color3.fromRGB(12, 8, 8)
    win.BorderSizePixel = 0
    win.Parent = expGui
    _Instance.new("UICorner", win).CornerRadius = UDim.new(0, 14)

    local border = _Instance.new("UIStroke")
    border.Color = Color3.fromRGB(220, 50, 50)
    border.Thickness = 2
    border.Parent = win

    local icon = _Instance.new("TextLabel")
    icon.Size = UDim2.new(1, 0, 0, 50)
    icon.Position = UDim2.new(0, 0, 0, 18)
    icon.BackgroundTransparency = 1
    icon.Text = "⛔"
    icon.TextSize = 36
    icon.Font = Enum.Font.Gotham
    icon.TextColor3 = Color3.fromRGB(220, 50, 50)
    icon.Parent = win

    local title = _Instance.new("TextLabel")
    title.Size = UDim2.new(1, -40, 0, 30)
    title.Position = UDim2.new(0, 20, 0, 68)
    title.BackgroundTransparency = 1
    title.Text = "HAS SIDO BANEADO"
    title.TextColor3 = Color3.fromRGB(255, 80, 80)
    title.Font = Enum.Font.GothamBold
    title.TextSize = 20
    title.Parent = win

    local msg = _Instance.new("TextLabel")
    msg.Size = UDim2.new(1, -40, 0, 40)
    msg.Position = UDim2.new(0, 20, 0, 100)
    msg.BackgroundTransparency = 1
    msg.Text = "Has sido baneado de Roblox."
    msg.TextColor3 = Color3.fromRGB(180, 120, 120)
    msg.Font = Enum.Font.Gotham
    msg.TextSize = 13
    msg.TextWrapped = true
    msg.Parent = win

    local countdown = _Instance.new("TextLabel")
    countdown.Size = UDim2.new(1, -40, 0, 24)
    countdown.Position = UDim2.new(0, 20, 0, 158)
    countdown.BackgroundTransparency = 1
    countdown.Text = "Saliendo en 5..."
    countdown.TextColor3 = Color3.fromRGB(120, 80, 80)
    countdown.Font = Enum.Font.GothamBold
    countdown.TextSize = 12
    countdown.Parent = win

    _task.spawn(function()
        local t = 0
        while expGui and expGui.Parent do
            t = t + 0.05
            border.Transparency = 0.3 + 0.3 * math.sin(t * 3)
            _task.wait(0.05)
        end
    end)

    for s = 5, 1, -1 do
        if countdown and countdown.Parent then
            countdown.Text = "Saliendo en " .. s .. "..."
        end
        _task.wait(1)
    end

    _pcall(function()
        player:Kick("Has sido baneado de Roblox")
    end)
end

-- ── Watcher de expiración post-hub ───────────────────────────
local function startKeyWatcher(key, keyType, hwid)
    _task.spawn(function()
        while true do
            _task.wait(CHECK_INTERVAL)
            local ok, resp = _pcall(httpPost, API_URL, { key = key, hwid = hwid, productId = PRODUCT_ID })
            if ok and resp then
                local isOk = resp.Success or (resp.StatusCode and resp.StatusCode >= 200 and resp.StatusCode < 300)
                if isOk then
                    local parseOk, data = _pcall(function()
                        return HttpService:JSONDecode(resp.Body)
                    end)
                    if parseOk and _type(data) == "table" then
                        if not data.valid then
                            showExpiredScreen(data.message or "Tu key ha expirado.")
                            break
                        end
                    end
                end
            end
        end
    end)
end

-- ── Limpiar instancia anterior ────────────────────────────────
if playerGui:FindFirstChild("X23Loader") then
    playerGui.X23Loader:Destroy()
end

-- Obtener HWID una sola vez al inicio
local HWID = getHWID()

-- ── ScreenGui principal ───────────────────────────────────────
local gui = _Instance.new("ScreenGui")
gui.Name = "X23Loader"
gui.ResetOnSpawn = false
gui.DisplayOrder = 999
gui.Parent = playerGui

local overlay = _Instance.new("Frame")
overlay.Size = UDim2.new(1, 0, 1, 0)
overlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
overlay.BackgroundTransparency = 0.45
overlay.BorderSizePixel = 0
overlay.Parent = gui

local win = _Instance.new("Frame")
win.Size = UDim2.new(0, 340, 0, 230)
win.Position = UDim2.new(0.5, -170, 0.5, -115)
win.BackgroundColor3 = Color3.fromRGB(9, 9, 13)
win.BorderSizePixel = 0
win.Parent = gui
_Instance.new("UICorner", win).CornerRadius = UDim.new(0, 14)

local stroke = _Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(0, 200, 255)
stroke.Thickness = 1.8
stroke.Parent = win

local title = _Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 38)
title.Position = UDim2.new(0, 0, 0, 12)
title.BackgroundTransparency = 1
title.Text = "✦ X23 HUB — LEGACY"
title.TextColor3 = Color3.fromRGB(0, 220, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 19
title.Parent = win

local sub = _Instance.new("TextLabel")
sub.Size = UDim2.new(1, 0, 0, 18)
sub.Position = UDim2.new(0, 0, 0, 50)
sub.BackgroundTransparency = 1
sub.Text = "Legacy PC • Ingresa tu key para continuar"
sub.TextColor3 = Color3.fromRGB(90, 130, 155)
sub.Font = Enum.Font.Gotham
sub.TextSize = 12
sub.Parent = win

local inputBg = _Instance.new("Frame")
inputBg.Size = UDim2.new(1, -40, 0, 38)
inputBg.Position = UDim2.new(0, 20, 0, 82)
inputBg.BackgroundColor3 = Color3.fromRGB(18, 18, 26)
inputBg.BorderSizePixel = 0
inputBg.Parent = win
_Instance.new("UICorner", inputBg).CornerRadius = UDim.new(0, 8)

local inputStroke = _Instance.new("UIStroke")
inputStroke.Color = Color3.fromRGB(40, 60, 80)
inputStroke.Thickness = 1.2
inputStroke.Parent = inputBg

local input = _Instance.new("TextBox")
input.Size = UDim2.new(1, -16, 1, 0)
input.Position = UDim2.new(0, 8, 0, 0)
input.BackgroundTransparency = 1
input.PlaceholderText = "X23-XXXX-XXXX-XXXX"
input.PlaceholderColor3 = Color3.fromRGB(55, 75, 95)
input.TextColor3 = Color3.fromRGB(220, 240, 255)
input.Font = Enum.Font.GothamBold
input.TextSize = 14
input.ClearTextOnFocus = false
input.Text = ""
input.Parent = inputBg

local btn = _Instance.new("TextButton")
btn.Size = UDim2.new(1, -40, 0, 38)
btn.Position = UDim2.new(0, 20, 0, 134)
btn.BackgroundColor3 = Color3.fromRGB(0, 160, 220)
btn.BorderSizePixel = 0
btn.Text = "Verificar Key"
btn.TextColor3 = Color3.fromRGB(255, 255, 255)
btn.Font = Enum.Font.GothamBold
btn.TextSize = 14
btn.Parent = win
_Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 8)

local btnGrad = _Instance.new("UIGradient")
btnGrad.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 180, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 100, 200)),
})
btnGrad.Rotation = 90
btnGrad.Parent = btn

local statusMsg = _Instance.new("TextLabel")
statusMsg.Size = UDim2.new(1, -40, 0, 28)
statusMsg.Position = UDim2.new(0, 20, 0, 186)
statusMsg.BackgroundTransparency = 1
statusMsg.Text = ""
statusMsg.TextColor3 = Color3.fromRGB(255, 80, 80)
statusMsg.Font = Enum.Font.Gotham
statusMsg.TextSize = 11
statusMsg.TextWrapped = true
statusMsg.Parent = win

local animating = true
_task.spawn(function()
    while animating do
        for hue = 0, 1, 0.012 do
            if not animating then break end
            stroke.Color = Color3.fromHSV(hue, 0.8, 1)
            _task.wait(0.04)
        end
    end
end)

local function setStatus(text, color)
    statusMsg.Text = text
    statusMsg.TextColor3 = color or Color3.fromRGB(255, 80, 80)
end
local function resetBtn()
    btn.Active = true
    btn.Text = "Verificar Key"
    btn.BackgroundColor3 = Color3.fromRGB(0, 160, 220)
    btnGrad.Enabled = true
end

local verifying = false
local function verify(candidateKey, fromSavedFile)
    if verifying then return end
    local key = (candidateKey or input.Text):match("^%s*(.-)%s*$")
    if key == "" then
        setStatus("⚠ Escribe tu key primero", Color3.fromRGB(255, 200, 0))
        return
    end

    verifying = true
    btn.Active = false
    btn.Text = "Verificando..."
    btn.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
    btnGrad.Enabled = false
    setStatus("", nil)

    local ok, response = _pcall(httpPost, API_URL, { key = key, hwid = HWID, productId = PRODUCT_ID })

    if not ok or not response then
        verifying = false
        resetBtn()
        setStatus(fromSavedFile and "❌ No se pudo comprobar la key guardada. Reintenta con conexión." or "❌ Sin conexión. Revisa el executor.", Color3.fromRGB(255, 80, 80))
        return
    end

    local isOk = response.Success or (response.StatusCode and response.StatusCode >= 200 and response.StatusCode < 300)
    if not isOk then
        verifying = false
        resetBtn()
        setStatus("❌ Error del servidor (" .. _tostring(response.StatusCode or "?") .. ")", Color3.fromRGB(255, 80, 80))
        return
    end

    local parseOk, data = _pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not parseOk or _type(data) ~= "table" then
        verifying = false
        resetBtn()
        setStatus("❌ Respuesta inválida.", Color3.fromRGB(255, 80, 80))
        return
    end

    if not data.valid then
        verifying = false
        if fromSavedFile then clearSavedKey() end
        input.Text = ""
        resetBtn()
        setStatus("❌ " .. (data.message or "Key inválida o expirada"), Color3.fromRGB(255, 80, 80))
        return
    end

    -- ✅ Key válida
    saveKey(key)
    animating = false
    _task.wait(0.05)
    stroke.Color = Color3.fromRGB(80, 255, 160)
    btn.BackgroundColor3 = Color3.fromRGB(30, 200, 100)
    btn.Text = "✅ Acceso concedido"
    btnGrad.Enabled = false

    local extraMsg = ""
    if data.assignedTo and data.assignedTo ~= "" then
        extraMsg = "👤 " .. _tostring(data.assignedTo) .. " — "
    end
    if data.type == "timed" and data.expiresAt then
        setStatus(extraMsg .. "Expira: " .. _tostring(data.expiresAt):sub(1, 10), Color3.fromRGB(80, 255, 160))
    else
        setStatus(extraMsg .. "Key permanente ✨", Color3.fromRGB(80, 255, 160))
    end

    _task.wait(1.2)
    gui:Destroy()

    -- Iniciar el watcher antes del hub para que no haya una ventana sin control.
    startKeyWatcher(key, data.type, HWID)

    -- Cargar el hub
    local ls = _loadstring or (_genv and _genv.loadstring)
    local hubOk, hubErr = _pcall(function()
        ls(_game:HttpGet(HUB_URL))()
    end)
    if not hubOk then
        _print("[X23 Hub] Error al cargar el hub: " .. _tostring(hubErr))
    end

end

btn.MouseButton1Click:Connect(verify)
input.FocusLost:Connect(function(enter)
    if enter then verify() end
end)

-- Si existe una key guardada, se verifica automáticamente. Si el servidor la
-- rechaza, se borra y la pantalla vuelve a pedir una key nueva.
local savedKey = loadSavedKey()
if savedKey then
    input.Text = savedKey
    sub.Text = "Legacy PC • Verificando key guardada..."
    _task.spawn(function()
        verify(savedKey, true)
    end)
end
