local player = game.Players.LocalPlayer
local playerGui = player.PlayerGui

if playerGui:FindFirstChild("SABHub") then
    playerGui.SABHub:Destroy()
end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "X23HUB"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Main window is taller now to fit the log area
local main = Instance.new("Frame")
main.Size = UDim2.new(0, 240, 0, 210)
main.Position = UDim2.new(0.5, -120, 0, 20)
main.BackgroundColor3 = Color3.fromRGB(10, 10, 14)
main.BackgroundTransparency = 0.1
main.BorderSizePixel = 0
main.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = main

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(0, 200, 255)
stroke.Transparency = 0.7
stroke.Thickness = 1
stroke.Parent = main

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 30)
header.Position = UDim2.new(0, 0, 0, 0)
header.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
header.BackgroundTransparency = 0.85
header.BorderSizePixel = 0
header.Parent = main

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 14)
headerCorner.Parent = header

local dot = Instance.new("Frame")
dot.Size = UDim2.new(0, 7, 0, 7)
dot.Position = UDim2.new(0, 12, 0.5, -3)
dot.BackgroundColor3 = Color3.fromRGB(0, 220, 255)
dot.BorderSizePixel = 0
dot.Parent = header

local dotCorner = Instance.new("UICorner")
dotCorner.CornerRadius = UDim.new(1, 0)
dotCorner.Parent = dot

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 1, 0)
title.Position = UDim2.new(0, 24, 0, 0)
title.BackgroundTransparency = 1
title.Text = "CODE PASTE X23"
title.TextColor3 = Color3.fromRGB(0, 220, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 11
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header
task.spawn(function()
	while true do
		for hue = 0, 1, 0.01 do
			local rgb = Color3.fromHSV(hue, 0.35, 0.35)

			stroke.Color = rgb
			title.TextColor3 = rgb
			dot.BackgroundColor3 = rgb
			header.BackgroundColor3 = rgb
            main.BackgroundColor3 = rgb:Lerp(Color3.fromRGB(10, 10, 14), 0.65)
			task.wait(0.03)
		end
	end
end)
local autoCodeBtn = Instance.new("TextButton")
autoCodeBtn.Size = UDim2.new(1, -20, 0, 28)
autoCodeBtn.Position = UDim2.new(0, 10, 0, 36)
autoCodeBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
autoCodeBtn.BackgroundTransparency = 0.85
autoCodeBtn.BorderSizePixel = 0
autoCodeBtn.Text = "AUTO CODE: OFF"
autoCodeBtn.TextColor3 = Color3.fromRGB(0, 220, 255)
autoCodeBtn.Font = Enum.Font.GothamBold
autoCodeBtn.TextSize = 12
autoCodeBtn.Parent = main

local autoCorner = Instance.new("UICorner")
autoCorner.CornerRadius = UDim.new(0, 8)
autoCorner.Parent = autoCodeBtn

local autoStroke = Instance.new("UIStroke")
autoStroke.Color = Color3.fromRGB(0, 200, 255)
autoStroke.Transparency = 0.6
autoStroke.Thickness = 1
autoStroke.Parent = autoCodeBtn

local upperBtn = Instance.new("TextButton")
upperBtn.Size = UDim2.new(0.5, -13, 0, 24)
upperBtn.Position = UDim2.new(0, 10, 0, 70)
upperBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
upperBtn.BackgroundTransparency = 0.75
upperBtn.BorderSizePixel = 0
upperBtn.Text = "UPPER"
upperBtn.TextColor3 = Color3.fromRGB(0, 220, 255)
upperBtn.Font = Enum.Font.GothamBold
upperBtn.TextSize = 11
upperBtn.Parent = main

local upperCorner = Instance.new("UICorner")
upperCorner.CornerRadius = UDim.new(0, 6)
upperCorner.Parent = upperBtn

local upperStroke = Instance.new("UIStroke")
upperStroke.Color = Color3.fromRGB(0, 200, 255)
upperStroke.Transparency = 0.5
upperStroke.Thickness = 1
upperStroke.Parent = upperBtn

local lowerBtn = Instance.new("TextButton")
lowerBtn.Size = UDim2.new(0.5, -13, 0, 24)
lowerBtn.Position = UDim2.new(0.5, 3, 0, 70)
lowerBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
lowerBtn.BackgroundTransparency = 0.93
lowerBtn.BorderSizePixel = 0
lowerBtn.Text = "lower"
lowerBtn.TextColor3 = Color3.fromRGB(150, 150, 170)
lowerBtn.Font = Enum.Font.Gotham
lowerBtn.TextSize = 11
lowerBtn.Parent = main

local lowerCorner = Instance.new("UICorner")
lowerCorner.CornerRadius = UDim.new(0, 6)
lowerCorner.Parent = lowerBtn

local lowerStroke = Instance.new("UIStroke")
lowerStroke.Color = Color3.fromRGB(100, 100, 120)
lowerStroke.Transparency = 0.7
lowerStroke.Thickness = 1
lowerStroke.Parent = lowerBtn

-- ===== Riddle log panel (new) =====
local logLabel = Instance.new("TextLabel")
logLabel.Size = UDim2.new(1, -20, 0, 14)
logLabel.Position = UDim2.new(0, 10, 0, 102)
logLabel.BackgroundTransparency = 1
logLabel.Text = "CODE HISTORY"
logLabel.TextColor3 = Color3.fromRGB(120, 200, 230)
logLabel.Font = Enum.Font.GothamBold
logLabel.TextSize = 10
logLabel.TextXAlignment = Enum.TextXAlignment.Left
logLabel.Parent = main

local logFrame = Instance.new("Frame")
logFrame.Size = UDim2.new(1, -20, 0, 92)
logFrame.Position = UDim2.new(0, 10, 0, 118)
logFrame.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
logFrame.BackgroundTransparency = 0.95
logFrame.BorderSizePixel = 0
logFrame.Parent = main

local logFrameCorner = Instance.new("UICorner")
logFrameCorner.CornerRadius = UDim.new(0, 8)
logFrameCorner.Parent = logFrame

local logScroll = Instance.new("ScrollingFrame")
logScroll.Size = UDim2.new(1, -8, 1, -8)
logScroll.Position = UDim2.new(0, 4, 0, 4)
logScroll.BackgroundTransparency = 1
logScroll.BorderSizePixel = 0
logScroll.ScrollBarThickness = 3
logScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
logScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
logScroll.Parent = logFrame

local logListLayout = Instance.new("UIListLayout")
logListLayout.SortOrder = Enum.SortOrder.LayoutOrder
logListLayout.Padding = UDim.new(0, 2)
logListLayout.Parent = logScroll

local MAX_LOG_ENTRIES = 30

local function addLogEntry(text, kind)
    -- kind: "code", "riddle_solved", "riddle_unknown"
    local color = Color3.fromRGB(0, 220, 255)
    if kind == "riddle_solved" then
        color = Color3.fromRGB(80, 255, 160)
    elseif kind == "riddle_unknown" then
        color = Color3.fromRGB(255, 170, 60)
    end

    local entry = Instance.new("TextLabel")
    entry.Size = UDim2.new(1, 0, 0, 0)
    entry.AutomaticSize = Enum.AutomaticSize.Y
    entry.BackgroundTransparency = 1
    entry.Text = text
    entry.TextColor3 = color
    entry.Font = Enum.Font.Gotham
    entry.TextSize = 10
    entry.TextWrapped = true
    entry.TextXAlignment = Enum.TextXAlignment.Left
    entry.Parent = logScroll

    -- trim old entries
    local children = logScroll:GetChildren()
    local count = 0
    for _, c in ipairs(children) do
        if c:IsA("TextLabel") then count = count + 1 end
    end
    if count > MAX_LOG_ENTRIES then
        for _, c in ipairs(children) do
            if c:IsA("TextLabel") then
                c:Destroy()
                break
            end
        end
    end

    task.defer(function()
        logScroll.CanvasPosition = Vector2.new(0, logScroll.AbsoluteCanvasSize.Y)
    end)
end

-- ===== Dragging =====
local dragging, dragStart, startPos
main.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        dragging = true
        dragStart = input.Position
        startPos = main.Position
    end
end)
main.InputChanged:Connect(function(input)
    if dragging and input.UserInputType == Enum.UserInputType.MouseMovement then
        local delta = input.Position - dragStart
        main.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    end
end)
main.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        dragging = false
    end
end)

local autoCodeEnabled = false
local caseMode = "upper"

local function setCase(mode)
    caseMode = mode
    if mode == "upper" then
        upperBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
        upperBtn.BackgroundTransparency = 0.75
        upperBtn.TextColor3 = Color3.fromRGB(0, 220, 255)
        upperStroke.Transparency = 0.5
        lowerBtn.BackgroundTransparency = 0.93
        lowerBtn.TextColor3 = Color3.fromRGB(150, 150, 170)
        lowerStroke.Transparency = 0.7
    else
        lowerBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
        lowerBtn.BackgroundTransparency = 0.75
        lowerBtn.TextColor3 = Color3.fromRGB(0, 220, 255)
        lowerStroke.Transparency = 0.5
        upperBtn.BackgroundTransparency = 0.93
        upperBtn.TextColor3 = Color3.fromRGB(150, 150, 170)
        upperStroke.Transparency = 0.7
    end
end

upperBtn.MouseButton1Click:Connect(function() setCase("upper") end)
lowerBtn.MouseButton1Click:Connect(function() setCase("lower") end)

local function openCodesMenu()
    local codesBtn = playerGui.LeftCenter.LeftCenter.Buttons.Codes
    if codesBtn then
        for _, conn in ipairs(getconnections(codesBtn.Activated)) do
            conn:Fire()
        end
    end
end

local function isCodesOpen()
    local codesGui = playerGui:FindFirstChild("Codes")
    if codesGui then
        local inner = codesGui:FindFirstChild("Codes")
        if inner then return inner.Visible end
        return codesGui.Enabled
    end
    return false
end

-- =====================================================================
-- RIDDLE TRIVIA TABLE
-- =====================================================================
-- Add new entries here as you learn them. Each entry needs:
--   keywords = a list of distinctive lowercase words/phrases that will
--              appear in the riddle notification text. The riddle is
--              considered a match if ALL keywords in the list are found
--              somewhere in the notification text (case-insensitive).
--   answer   = the exact text to type into the code/redeem box.
--
-- Keep keyword lists short and distinctive so they don't accidentally
-- match unrelated notifications. Order matters: the FIRST fully-matching
-- entry found wins, so put more specific entries earlier if needed.
-- =====================================================================

local riddleTable = {
    {
        keywords = {"mutation", "favourite"},   -- adjust to match the real wording you see
        answer = "Candy24Sammy",
    },
    {
        keywords = {"admin", "wars"},
        answer = "",  -- fill in once you know it
    },
    {
        keywords = {"2nd mutation"},
        answer = "",  -- fill in once you know it
    },
    {
        keywords = {"favourite", "brainrot"},
        answer = "",  -- fill in once you know it
    },
    {
        keywords = {"facts", "owner"},
        answer = "",  -- fill in once you know it
    },
}

-- Tries to find a matching riddle entry for the given notification text.
-- Returns the answer string if a full keyword match is found, otherwise nil.
local function findRiddleAnswer(text)
    local lowerText = text:lower()
    for _, entry in ipairs(riddleTable) do
        if entry.answer ~= "" then
            local allFound = true
            for _, kw in ipairs(entry.keywords) do
                if not lowerText:find(kw:lower(), 1, true) then
                    allFound = false
                    break
                end
            end
            if allFound then
                return entry.answer
            end
        end
    end
    return nil
end

-- Centralized "type into redeem box" helper used by both codes and riddles
local function typeIntoCodeBox(rawText)
    local formatted = caseMode == "upper" and rawText:upper() or rawText:lower()
    local codeBox = playerGui.Codes.Codes.CodeRedeem.TextBox
    if codeBox then
        codeBox:CaptureFocus()
        codeBox.Text = (codeBox.Text or "") .. formatted
        print("TYPED:", codeBox.Text)
    end
    return formatted
end

autoCodeBtn.MouseButton1Click:Connect(function()
    autoCodeEnabled = not autoCodeEnabled
    if autoCodeEnabled then
        autoCodeBtn.Text = "AUTO CODE: ON"
        autoCodeBtn.TextColor3 = Color3.fromRGB(80, 255, 160)
        autoStroke.Color = Color3.fromRGB(80, 255, 160)
        task.spawn(function()
            while autoCodeEnabled do
                if not isCodesOpen() then
                    openCodesMenu()
                end
                task.wait(0.5)
            end
        end)
    else
        autoCodeEnabled = false
        autoCodeBtn.Text = "AUTO CODE: OFF"
        autoCodeBtn.TextColor3 = Color3.fromRGB(0, 220, 255)
        autoStroke.Color = Color3.fromRGB(0, 200, 255)
    end
end)

-- =====================================================================
-- STANDALONE RIDDLE SOLVER WINDOW
-- =====================================================================
-- A separate draggable window. Paste/type any riddle text into the box,
-- press SOLVE, and if it matches an entry in riddleTable, the answer is
-- auto-typed into the code redeem box (same as the auto-detected flow)
-- and shown in this window's result label.
-- =====================================================================

local riddleWin = Instance.new("Frame")
riddleWin.Name = "RiddleSolver"
riddleWin.Size = UDim2.new(0, 240, 0, 168)
riddleWin.Position = UDim2.new(0.5, -120, 0, 250)
riddleWin.BackgroundColor3 = Color3.fromRGB(10, 10, 14)
riddleWin.BackgroundTransparency = 0.1
riddleWin.BorderSizePixel = 0
riddleWin.Parent = screenGui

local riddleCorner = Instance.new("UICorner")
riddleCorner.CornerRadius = UDim.new(0, 14)
riddleCorner.Parent = riddleWin

local riddleStroke = Instance.new("UIStroke")
riddleStroke.Color = Color3.fromRGB(255, 170, 60)
riddleStroke.Transparency = 0.6
riddleStroke.Thickness = 1
riddleStroke.Parent = riddleWin

local riddleHeader = Instance.new("Frame")
riddleHeader.Size = UDim2.new(1, 0, 0, 30)
riddleHeader.Position = UDim2.new(0, 0, 0, 0)
riddleHeader.BackgroundColor3 = Color3.fromRGB(255, 170, 60)
riddleHeader.BackgroundTransparency = 0.85
riddleHeader.BorderSizePixel = 0
riddleHeader.Parent = riddleWin

local riddleHeaderCorner = Instance.new("UICorner")
riddleHeaderCorner.CornerRadius = UDim.new(0, 14)
riddleHeaderCorner.Parent = riddleHeader

local riddleDot = Instance.new("Frame")
riddleDot.Size = UDim2.new(0, 7, 0, 7)
riddleDot.Position = UDim2.new(0, 12, 0.5, -3)
riddleDot.BackgroundColor3 = Color3.fromRGB(255, 190, 90)
riddleDot.BorderSizePixel = 0
riddleDot.Parent = riddleHeader
task.spawn(function()
	while true do
		for hue = 0, 1, 0.01 do
			local rgb = Color3.fromHSV(hue, 1, 1)

			riddleWin.BackgroundColor3 = rgb:Lerp(Color3.fromRGB(10, 10, 14), 0.65)
			riddleStroke.Color = rgb
			riddleHeader.BackgroundColor3 = rgb
			riddleTitle.TextColor3 = rgb
			riddleDot.BackgroundColor3 = rgb

			task.wait(0.03)
		end
	end
end)
local riddleDotCorner = Instance.new("UICorner")
riddleDotCorner.CornerRadius = UDim.new(1, 0)
riddleDotCorner.Parent = riddleDot

local riddleTitle = Instance.new("TextLabel")
riddleTitle.Size = UDim2.new(1, -24, 1, 0)
riddleTitle.Position = UDim2.new(0, 24, 0, 0)
riddleTitle.BackgroundTransparency = 1
riddleTitle.Text = "ADVERTISEMENT HISTORY"
riddleTitle.TextColor3 = Color3.fromRGB(255, 190, 90)
riddleTitle.Font = Enum.Font.GothamBold
riddleTitle.TextSize = 11
riddleTitle.TextXAlignment = Enum.TextXAlignment.Left
riddleTitle.Parent = riddleHeader

-- Input box for pasting/typing the riddle text
local riddleInputFrame = Instance.new("Frame")
riddleInputFrame.Size = UDim2.new(1, -20, 0, 56)
riddleInputFrame.Position = UDim2.new(0, 10, 0, 38)
riddleInputFrame.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
riddleInputFrame.BackgroundTransparency = 0.95
riddleInputFrame.BorderSizePixel = 0
riddleInputFrame.Parent = riddleWin

local riddleInputCorner = Instance.new("UICorner")
riddleInputCorner.CornerRadius = UDim.new(0, 8)
riddleInputCorner.Parent = riddleInputFrame

local riddleInputBox = Instance.new("TextBox")
riddleInputBox.Size = UDim2.new(1, -12, 1, -8)
riddleInputBox.Position = UDim2.new(0, 6, 0, 4)
riddleInputBox.BackgroundTransparency = 1
riddleInputBox.PlaceholderText = "Paste riddle text here..."
riddleInputBox.PlaceholderColor3 = Color3.fromRGB(120, 120, 130)
riddleInputBox.Text = ""
riddleInputBox.TextColor3 = Color3.fromRGB(230, 230, 235)
riddleInputBox.Font = Enum.Font.Gotham
riddleInputBox.TextSize = 12
riddleInputBox.TextWrapped = true
riddleInputBox.MultiLine = true
riddleInputBox.ClearTextOnFocus = false
riddleInputBox.TextXAlignment = Enum.TextXAlignment.Left
riddleInputBox.TextYAlignment = Enum.TextYAlignment.Top
riddleInputBox.Parent = riddleInputFrame

-- Result label, shows the matched answer or "no match" feedback
local riddleResultLabel = Instance.new("TextLabel")
riddleResultLabel.Size = UDim2.new(1, -20, 0, 16)
riddleResultLabel.Position = UDim2.new(0, 10, 0, 98)
riddleResultLabel.BackgroundTransparency = 1
riddleResultLabel.Text = "Answer will appear here"
riddleResultLabel.TextColor3 = Color3.fromRGB(150, 150, 170)
riddleResultLabel.Font = Enum.Font.GothamBold
riddleResultLabel.TextSize = 11
riddleResultLabel.TextWrapped = true
riddleResultLabel.TextXAlignment = Enum.TextXAlignment.Left
riddleResultLabel.Parent = riddleWin

-- Solve button: looks up the answer and auto-types it into the redeem box
local solveBtn = Instance.new("TextButton")
solveBtn.Size = UDim2.new(0.6, -13, 0, 26)
solveBtn.Position = UDim2.new(0, 10, 0, 130)
solveBtn.BackgroundColor3 = Color3.fromRGB(255, 170, 60)
solveBtn.BackgroundTransparency = 0.75
solveBtn.BorderSizePixel = 0
solveBtn.Text = "SOLVE & PASTE"
solveBtn.TextColor3 = Color3.fromRGB(255, 200, 110)
solveBtn.Font = Enum.Font.GothamBold
solveBtn.TextSize = 11
solveBtn.Parent = riddleWin

local solveCorner = Instance.new("UICorner")
solveCorner.CornerRadius = UDim.new(0, 6)
solveCorner.Parent = solveBtn

local solveStroke = Instance.new("UIStroke")
solveStroke.Color = Color3.fromRGB(255, 170, 60)
solveStroke.Transparency = 0.5
solveStroke.Thickness = 1
solveStroke.Parent = solveBtn

-- Clear button: empties the input + resets the result label
local clearBtn = Instance.new("TextButton")
clearBtn.Size = UDim2.new(0.4, -7, 0, 26)
clearBtn.Position = UDim2.new(0.6, 10, 0, 130)
clearBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
clearBtn.BackgroundTransparency = 0.93
clearBtn.BorderSizePixel = 0
clearBtn.Text = "CLEAR"
clearBtn.TextColor3 = Color3.fromRGB(150, 150, 170)
clearBtn.Font = Enum.Font.Gotham
clearBtn.TextSize = 11
clearBtn.Parent = riddleWin

local clearCorner = Instance.new("UICorner")
clearCorner.CornerRadius = UDim.new(0, 6)
clearCorner.Parent = clearBtn

local clearStroke = Instance.new("UIStroke")
clearStroke.Color = Color3.fromRGB(100, 100, 120)
clearStroke.Transparency = 0.7
clearStroke.Thickness = 1
clearStroke.Parent = clearBtn

solveBtn.MouseButton1Click:Connect(function()
    local riddleText = riddleInputBox.Text
    if riddleText == nil or riddleText:gsub("%s", "") == "" then
        riddleResultLabel.Text = "Type or paste a riddle first"
        riddleResultLabel.TextColor3 = Color3.fromRGB(255, 170, 60)
        return
    end

    local answer = findRiddleAnswer(riddleText)
    if answer then
        typeIntoCodeBox(answer)
        riddleResultLabel.Text = "Answer: " .. answer .. " (pasted)"
        riddleResultLabel.TextColor3 = Color3.fromRGB(80, 255, 160)
        addLogEntry("MANUAL SOLVE -> " .. answer, "riddle_solved")
    else
        riddleResultLabel.Text = "No match found in riddle table"
        riddleResultLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
        addLogEntry("MANUAL UNKNOWN: " .. riddleText, "riddle_unknown")
    end
end)

clearBtn.MouseButton1Click:Connect(function()
    riddleInputBox.Text = ""
    riddleResultLabel.Text = "Answer will appear here"
    riddleResultLabel.TextColor3 = Color3.fromRGB(150, 150, 170)
end)

-- Dragging for the riddle solver window
local riddleDragging, riddleDragStart, riddleStartPos
riddleWin.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        riddleDragging = true
        riddleDragStart = input.Position
        riddleStartPos = riddleWin.Position
    end
end)
riddleWin.InputChanged:Connect(function(input)
    if riddleDragging and input.UserInputType == Enum.UserInputType.MouseMovement then
        local delta = input.Position - riddleDragStart
        riddleWin.Position = UDim2.new(riddleStartPos.X.Scale, riddleStartPos.X.Offset + delta.X, riddleStartPos.Y.Scale, riddleStartPos.Y.Offset + delta.Y)
    end
end)
riddleWin.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        riddleDragging = false
    end
end)

-- =====================================================================
-- HINT LOGGER
-- =====================================================================
-- Passively records every notification's text (timestamped) so you can
-- scroll back through everything that's been announced during an event
-- (e.g. "Admin Abuse") to look for hints once a riddle shows up.
-- This does NOT try to match or solve anything automatically — it's a
-- read-only history for you to check manually.
-- =====================================================================

-- Grows the riddle window downward to fit the hint logger section
riddleWin.Size = UDim2.new(0, 240, 0, 168 + 28 + 110)

local hintToggleBtn = Instance.new("TextButton")
hintToggleBtn.Size = UDim2.new(1, -20, 0, 24)
hintToggleBtn.Position = UDim2.new(0, 10, 0, 164)
hintToggleBtn.BackgroundColor3 = Color3.fromRGB(255, 170, 60)
hintToggleBtn.BackgroundTransparency = 0.85
hintToggleBtn.BorderSizePixel = 0
hintToggleBtn.Text = "HINT LOGGER: OFF"
hintToggleBtn.TextColor3 = Color3.fromRGB(255, 190, 90)
hintToggleBtn.Font = Enum.Font.GothamBold
hintToggleBtn.TextSize = 11
hintToggleBtn.Parent = riddleWin

local hintToggleCorner = Instance.new("UICorner")
hintToggleCorner.CornerRadius = UDim.new(0, 6)
hintToggleCorner.Parent = hintToggleBtn

local hintToggleStroke = Instance.new("UIStroke")
hintToggleStroke.Color = Color3.fromRGB(255, 170, 60)
hintToggleStroke.Transparency = 0.5
hintToggleStroke.Thickness = 1
hintToggleStroke.Parent = hintToggleBtn

local hintListLabel = Instance.new("TextLabel")
hintListLabel.Size = UDim2.new(1, -20, 0, 14)
hintListLabel.Position = UDim2.new(0, 10, 0, 194)
hintListLabel.BackgroundTransparency = 1
hintListLabel.Text = "MESSAGE HISTORY"
hintListLabel.TextColor3 = Color3.fromRGB(255, 190, 90)
hintListLabel.Font = Enum.Font.GothamBold
hintListLabel.TextSize = 10
hintListLabel.TextXAlignment = Enum.TextXAlignment.Left
hintListLabel.Parent = riddleWin

local hintFrame = Instance.new("Frame")
hintFrame.Size = UDim2.new(1, -20, 0, 82)
hintFrame.Position = UDim2.new(0, 10, 0, 210)
hintFrame.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
hintFrame.BackgroundTransparency = 0.95
hintFrame.BorderSizePixel = 0
hintFrame.Parent = riddleWin

local hintFrameCorner = Instance.new("UICorner")
hintFrameCorner.CornerRadius = UDim.new(0, 8)
hintFrameCorner.Parent = hintFrame

local hintScroll = Instance.new("ScrollingFrame")
hintScroll.Size = UDim2.new(1, -8, 1, -8)
hintScroll.Position = UDim2.new(0, 4, 0, 4)
hintScroll.BackgroundTransparency = 1
hintScroll.BorderSizePixel = 0
hintScroll.ScrollBarThickness = 3
hintScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
hintScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
hintScroll.Parent = hintFrame

local hintListLayout = Instance.new("UIListLayout")
hintListLayout.SortOrder = Enum.SortOrder.LayoutOrder
hintListLayout.Padding = UDim.new(0, 2)
hintListLayout.Parent = hintScroll

local hintLoggerEnabled = false
local MAX_HINT_ENTRIES = 100

local function addHintEntry(text)
    local timestamp = os.date("%H:%M:%S")

    local entry = Instance.new("TextLabel")
    entry.Size = UDim2.new(1, 0, 0, 0)
    entry.AutomaticSize = Enum.AutomaticSize.Y
    entry.BackgroundTransparency = 1
    entry.Text = "[" .. timestamp .. "] " .. text
    entry.TextColor3 = Color3.fromRGB(220, 220, 230)
    entry.Font = Enum.Font.Gotham
    entry.TextSize = 10
    entry.TextWrapped = true
    entry.TextXAlignment = Enum.TextXAlignment.Left
    entry.Parent = hintScroll

    local children = hintScroll:GetChildren()
    local count = 0
    for _, c in ipairs(children) do
        if c:IsA("TextLabel") then count = count + 1 end
    end
    if count > MAX_HINT_ENTRIES then
        for _, c in ipairs(children) do
            if c:IsA("TextLabel") then
                c:Destroy()
                break
            end
        end
    end

    task.defer(function()
        hintScroll.CanvasPosition = Vector2.new(0, hintScroll.AbsoluteCanvasSize.Y)
    end)
end

hintToggleBtn.MouseButton1Click:Connect(function()
    hintLoggerEnabled = not hintLoggerEnabled
    if hintLoggerEnabled then
        hintToggleBtn.Text = "HINT LOGGER: ON"
        hintToggleBtn.TextColor3 = Color3.fromRGB(80, 255, 160)
        hintToggleStroke.Color = Color3.fromRGB(80, 255, 160)
    else
        hintToggleBtn.Text = "HINT LOGGER: OFF"
        hintToggleBtn.TextColor3 = Color3.fromRGB(255, 190, 90)
        hintToggleStroke.Color = Color3.fromRGB(255, 170, 60)
    end
end)

-- Processes one notification text: checks riddle table first, falls back
-- to typing the raw text (existing code behavior) if no riddle matches.
-- Also feeds the passive hint logger if it's enabled.
local function handleNotificationText(text)
    if text == "" then return end

    if hintLoggerEnabled then
        addHintEntry(text)
    end

    if not autoCodeEnabled then return end

    local riddleAnswer = findRiddleAnswer(text)
    if riddleAnswer then
        typeIntoCodeBox(riddleAnswer)
        addLogEntry("RIDDLE SOLVED -> " .. riddleAnswer, "riddle_solved")
    else
        -- Heuristic: if it looks like riddle-style trivia text but we don't
        -- have an answer for it yet, log it instead of typing garbage.
        local looksLikeRiddle = text:lower():find("who") or text:lower():find("what")
            or text:lower():find("riddle") or text:lower():find("favourite")
            or text:lower():find("favorite")

        if looksLikeRiddle then
            addLogEntry("UNKNOWN RIDDLE: " .. text, "riddle_unknown")
        else
            typeIntoCodeBox(text)
            addLogEntry("CODE -> " .. text, "code")
        end
    end
end

playerGui.DescendantAdded:Connect(function(v)
    if v:IsA("TextLabel") and v.Name == "Template" and v:FindFirstAncestor("TopNotification") then
        task.defer(function()
            local text = v.Text
            handleNotificationText(text)

            v:GetPropertyChangedSignal("Text"):Connect(function()
                handleNotificationText(v.Text)
            end)
        end)
    end
end)
