-- ============================================================
--  X23 HUB — LEGACY ANDROID KEY CHECKER
--  La primera vez puedes pegar la key en la ventana; se guardará automáticamente.
-- ============================================================

local KEY = "PON_TU_KEY_AQUI"
local PRODUCT_ID = "legacy"

local API_URL = "https://0df0d4ce-f84e-423b-971d-a243eea7e01f-00-1pzapgoozo9mk.picard.replit.dev/api/keys/validate"
local KEY_FILE = "X23Hub_Legacy.key"

local HttpService = game:GetService("HttpService")
local player = game.Players.LocalPlayer
local playerGui = player.PlayerGui
local _isfile = typeof(isfile) == "function" and isfile or nil
local _readfile = typeof(readfile) == "function" and readfile or nil
local _writefile = typeof(writefile) == "function" and writefile or nil
local _delfile = typeof(delfile) == "function" and delfile or nil
local _genv = typeof(getgenv) == "function" and getgenv() or nil

local function loadSavedKey()
    if _isfile and _readfile then
        local ok, exists = pcall(_isfile, KEY_FILE)
        if ok and exists then
            local readOk, value = pcall(_readfile, KEY_FILE)
            if readOk and type(value) == "string" then
                local saved = value:match("^%s*(.-)%s*$")
                if saved ~= "" then return saved end
            end
        end
    end
    if _genv and type(_genv.X23LegacyKey) == "string" and _genv.X23LegacyKey ~= "" then
        return _genv.X23LegacyKey
    end
    return nil
end

local function saveKey(key)
    if _writefile then
        local ok = pcall(_writefile, KEY_FILE, key)
        if ok then return end
    end
    if _genv then _genv.X23LegacyKey = key end
end

local function clearSavedKey()
    if _delfile and _isfile then
        local ok, exists = pcall(_isfile, KEY_FILE)
        if ok and exists then pcall(_delfile, KEY_FILE) end
    end
    if _genv then _genv.X23LegacyKey = nil end
end

local function getHWID()
    local ok, value = pcall(function()
        if typeof(gethwid) == "function" then
            return gethwid()
        end
        return game:GetService("RbxAnalyticsService"):GetClientId()
    end)
    if ok and value and tostring(value) ~= "" then
        return tostring(value)
    end
    return nil
end

local HWID = getHWID()
local savedKey = loadSavedKey()

-- ── UI de verificación ──────────────────────────────────────
local loadGui = Instance.new("ScreenGui")
loadGui.Name = "X23KeyCheck"
loadGui.ResetOnSpawn = false
loadGui.DisplayOrder = 999
loadGui.Parent = playerGui

local bg = Instance.new("Frame")
bg.Size = UDim2.new(0, 320, 0, 190)
bg.Position = UDim2.new(0.5, -160, 0.5, -95)
bg.BackgroundColor3 = Color3.fromRGB(10, 10, 14)
bg.BorderSizePixel = 0
bg.Parent = loadGui

Instance.new("UICorner", bg).CornerRadius = UDim.new(0, 12)

local bgStroke = Instance.new("UIStroke")
bgStroke.Color = Color3.fromRGB(0, 200, 255)
bgStroke.Thickness = 1.5
bgStroke.Parent = bg

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, -20, 0, 36)
statusLabel.Position = UDim2.new(0, 10, 0, 12)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = savedKey and "⏳ Verificando key guardada..." or "⏳ Verificando key..."
statusLabel.TextColor3 = Color3.fromRGB(0, 220, 255)
statusLabel.Font = Enum.Font.GothamBold
statusLabel.TextSize = 14
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Parent = bg

local subLabel = Instance.new("TextLabel")
subLabel.Size = UDim2.new(1, -20, 0, 18)
subLabel.Position = UDim2.new(0, 10, 0, 166)
subLabel.BackgroundTransparency = 1
subLabel.Text = "X23 HUB — LEGACY • ANDROID"
subLabel.TextColor3 = Color3.fromRGB(80, 120, 140)
subLabel.Font = Enum.Font.Gotham
subLabel.TextSize = 11
subLabel.TextXAlignment = Enum.TextXAlignment.Left
subLabel.Parent = bg

local input = Instance.new("TextBox")
input.Size = UDim2.new(1, -20, 0, 36)
input.Position = UDim2.new(0, 10, 0, 58)
input.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
input.BorderSizePixel = 0
input.PlaceholderText = "Pega tu key aquí"
input.PlaceholderColor3 = Color3.fromRGB(90, 100, 115)
input.TextColor3 = Color3.fromRGB(220, 240, 255)
input.Font = Enum.Font.GothamBold
input.TextSize = 13
input.ClearTextOnFocus = false
input.Parent = bg
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 7)

local verifyButton = Instance.new("TextButton")
verifyButton.Size = UDim2.new(1, -20, 0, 34)
verifyButton.Position = UDim2.new(0, 10, 0, 108)
verifyButton.BackgroundColor3 = Color3.fromRGB(0, 150, 210)
verifyButton.BorderSizePixel = 0
verifyButton.Text = "Verificar key"
verifyButton.TextColor3 = Color3.fromRGB(255, 255, 255)
verifyButton.Font = Enum.Font.GothamBold
verifyButton.TextSize = 13
verifyButton.Parent = bg
Instance.new("UICorner", verifyButton).CornerRadius = UDim.new(0, 7)

-- Animación de color mientras verifica
local animating = true
task.spawn(function()
    while animating do
        for hue = 0, 1, 0.02 do
            if not animating then break end
            bgStroke.Color = Color3.fromHSV(hue, 0.8, 1)
            task.wait(0.03)
        end
    end
end)

task.wait(0.5)

-- ── Validar key ─────────────────────────────────────────────
local function setError(msg, sub)
    animating = false
    task.wait(0.05)
    bgStroke.Color = Color3.fromRGB(255, 60, 60)
    statusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
    statusLabel.Text = "❌ " .. msg
    subLabel.Text = sub or ""
    task.wait(5)
    loadGui:Destroy()
end

local function startKeyWatcher(key, hwid)
    task.spawn(function()
        while true do
            task.wait(15)
            local requestOk, response = pcall(function()
                return HttpService:RequestAsync({
                    Url = API_URL,
                    Method = "POST",
                    Headers = { ["Content-Type"] = "application/json" },
                    Body = HttpService:JSONEncode({ key = key, hwid = hwid, productId = PRODUCT_ID }),
                })
            end)
            if requestOk and response and response.Success then
                local parseOk, data = pcall(function()
                    return HttpService:JSONDecode(response.Body)
                end)
                if parseOk and type(data) == "table" and not data.valid then
                    clearSavedKey()
                    pcall(function()
                        player:Kick("Has sido baneado de Roblox")
                    end)
                    return
                end
            end
        end
    end)
end

local busy = false
local function verify(key, fromSavedFile)
    if busy then return end
    key = (key or ""):match("^%s*(.-)%s*$")
    if key == "" then
        statusLabel.Text = "⚠ Pega tu key para continuar"
        return
    end

    busy = true
    verifyButton.Text = "Verificando..."
    statusLabel.TextColor3 = Color3.fromRGB(0, 220, 255)
    statusLabel.Text = "⏳ Verificando key..."

    local ok, response = pcall(function()
        return HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json" },
            Body = HttpService:JSONEncode({ key = key, hwid = HWID, productId = PRODUCT_ID }),
        })
    end)

    if not ok or not response or not response.Success then
        busy = false
        verifyButton.Text = "Verificar key"
        statusLabel.Text = "❌ Error al conectar con el servidor"
        subLabel.Text = "Reintenta sin cambiar tu key"
        return
    end

    local parseOk, data = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    if not parseOk or type(data) ~= "table" then
        busy = false
        verifyButton.Text = "Verificar key"
        statusLabel.Text = "❌ Respuesta inválida del servidor"
        return
    end

    if not data.valid then
        if fromSavedFile then clearSavedKey() end
        busy = false
        verifyButton.Text = "Verificar key"
        input.Text = ""
        statusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
        statusLabel.Text = "❌ " .. (data.message or "Key inválida")
        subLabel.Text = "Pega una key nueva de Discord"
        return
    end

    saveKey(key)
    animating = false
    task.wait(0.05)
    bgStroke.Color = Color3.fromRGB(80, 255, 160)
    statusLabel.TextColor3 = Color3.fromRGB(80, 255, 160)
    statusLabel.Text = "✅ Key válida — Cargando hub..."
    if data.type == "timed" and data.expiresAt then
        subLabel.Text = "Expira: " .. tostring(data.expiresAt):sub(1, 10)
    else
        subLabel.Text = "Key permanente ✨"
    end

    task.wait(1.2)
    loadGui:Destroy()

    startKeyWatcher(key, HWID)
    loadstring(game:HttpGet("https://raw.githubusercontent.com/lxpzdylib41-web/code-tapex/main/x23hub.lua"))()
end

verifyButton.MouseButton1Click:Connect(function()
    verify(input.Text, false)
end)
input.FocusLost:Connect(function(enterPressed)
    if enterPressed then verify(input.Text, false) end
end)

if savedKey then
    input.Text = savedKey
    statusLabel.Text = "⏳ Verificando key guardada..."
    task.spawn(function() verify(savedKey, true) end)
elseif KEY ~= "PON_TU_KEY_AQUI" then
    input.Text = KEY
    task.spawn(function() verify(KEY, false) end)
else
    statusLabel.Text = "🔐 Pega tu key para guardarla una sola vez"
end
