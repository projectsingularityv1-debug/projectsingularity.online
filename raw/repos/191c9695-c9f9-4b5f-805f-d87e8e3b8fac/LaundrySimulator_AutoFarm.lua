if getgenv().KT_LaundrySimulator_Loaded then
    warn("Laundry Simulator Auto Farm is already running!")
    return
end
getgenv().KT_LaundrySimulator_Loaded = true

local Library = loadstring(game:HttpGet("https://projectsingularity.online/raw/repos/191c9695-c9f9-4b5f-805f-d87e8e3b8fac/ui.lua"))()
local UIS = game:GetService("UserInputService")
local WindowSize = UIS.TouchEnabled and UDim2.fromOffset(550, 550) or UDim2.fromOffset(570,450)

local Window = Library:Window({
    Title = "Singularity Hub",
    Desc = "Laundry Simulator Auto Farm",
    Version = "1.0",
    Icon = 115975178132422,
    Theme = "Dark",
    Config = {
        Keybind = Enum.KeyCode.RightShift,
        Size = WindowSize
    },
    CloseUIButton = {
        Enabled = true,
        Text = "Close"
    },
    Profile = {
        Username = getgenv().KeyUsername or "N/A",
        Email = "UID: " .. tostring(game:GetService("Players").LocalPlayer.UserId),
        AvatarUrl = getgenv().KeyAvatar
    }
})

local FarmTab = Window:Tab({ Title = "Auto Farm", Icon = "zap" })

getgenv().AutoGrab = false
getgenv().AutoWash = false
if getgenv().LaundryFarmRunning then
    getgenv().LaundryFarmRunning = false
    task.wait(1) -- รอให้ Loop เก่าๆ หยุดทำงาน
end
getgenv().LaundryFarmRunning = true

getgenv().AutoSell = false
getgenv().AutoSpin = false
getgenv().AutoBuyMachine = false
getgenv().AutoEquipMachine = false
getgenv().AutoBuyBasket = false
getgenv().AutoChallenge = false
getgenv().IsSelling = false
getgenv().IsWashing = false
getgenv().Noclip = true
getgenv().CameraNoclip = true
getgenv().FlySpeed = 60
getgenv().AntiAFK = true
getgenv().ClothESP = false
getgenv().ESPNormal = true
getgenv().ESPRare = true
getgenv().FilterNormal = true
getgenv().FilterGold = true
getgenv().FilterPurple = true
getgenv().FilterRed = true
getgenv().FilterBlue = true
getgenv().FilterGreen = true
getgenv().FilterOther = true
getgenv().FilterMitten = true
getgenv().FilterSock = true
getgenv().FilterShirt = true
getgenv().FilterShorts = true
getgenv().FilterSweater = true
getgenv().FilterTowel = true
getgenv().FilterUnderpants = true

getgenv().DebugFarm = false
local function DebugLog(msg)
    if getgenv().DebugFarm then
        print("[AutoFarm Debug] " .. tostring(msg))
    end
end

local PlayerTab = Window:Tab({ Title = "Player", Icon = "user" })

PlayerTab:Toggle({ 
    Title = "Noclip (เดินทะลุกำแพง)", 
    Image = "user-minus", 
    Value = getgenv().Noclip, 
    Callback = function(val) 
        getgenv().Noclip = val 
    end
})

PlayerTab:Toggle({ 
    Title = "Anti AFK (กันหลุดจากเกม)", 
    Image = "shield", 
    Value = getgenv().AntiAFK, 
    Callback = function(val) 
        getgenv().AntiAFK = val 
    end 
})

PlayerTab:Toggle({ 
    Title = "Camera Noclip (กล้องทะลุกำแพง)", 
    Image = "eye", 
    Value = getgenv().CameraNoclip, 
    Callback = function(val) 
        getgenv().CameraNoclip = val
        if val then
            game.Players.LocalPlayer.DevCameraOcclusionMode = Enum.DevCameraOcclusionMode.Invisicam
        else
            game.Players.LocalPlayer.DevCameraOcclusionMode = Enum.DevCameraOcclusionMode.Zoom
        end
    end 
})

PlayerTab:Slider({
    Title = "Fly Speed (ความเร็วบิน)",
    Desc = "ปรับความเร็วการบิน (ปกติ 60)",
    Min = 10,
    Max = 300,
    Default = 60,
    Callback = function(val)
        getgenv().FlySpeed = val
    end
})

FarmTab:Toggle({ 
    Title = "Auto Grab Clothes (เก็บผ้าออโต้)", 
    Image = "user", 
    Value = getgenv().AutoGrab, 
    Callback = function(val) 
        getgenv().AutoGrab = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Wash (ซักผ้าออโต้)", 
    Image = "zap", 
    Value = getgenv().AutoWash, 
    Callback = function(val) 
        getgenv().AutoWash = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Sell (โยนลงปล่องขายออโต้)", 
    Image = "coins", 
    Value = getgenv().AutoSell, 
    Callback = function(val) 
        getgenv().AutoSell = val 
    end 
})


FarmTab:Toggle({ 
    Title = "Auto Spin Wheel (หมุนวงล้อออโต้)", 
    Image = "target", 
    Value = getgenv().AutoSpin, 
    Callback = function(val) 
        getgenv().AutoSpin = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Buy Machine (ซื้อเครื่องซักผ้าออโต้)", 
    Image = "shopping-cart", 
    Value = getgenv().AutoBuyMachine, 
    Callback = function(val) 
        getgenv().AutoBuyMachine = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Equip Best Machine (จัดวางเครื่องที่ดีที่สุด)", 
    Image = "package", 
    Value = getgenv().AutoEquipMachine, 
    Callback = function(val) 
        getgenv().AutoEquipMachine = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Buy Basket (ซื้อตะกร้าออโต้)", 
    Image = "shopping-bag", 
    Value = getgenv().AutoBuyBasket, 
    Callback = function(val) 
        getgenv().AutoBuyBasket = val 
    end 
})

FarmTab:Toggle({ 
    Title = "Auto Claim Challenges (รับของรางวัลเควส)", 
    Image = "award", 
    Value = getgenv().AutoChallenge, 
    Callback = function(val) 
        getgenv().AutoChallenge = val 
    end 
})

local FilterTab = Window:Tab({ Title = "Cloth Filter", Icon = "filter" })

FilterTab:Toggle({ Title = "Normal (ไม่มีเอฟเฟกต์)", Image = "target", Value = getgenv().FilterNormal, Callback = function(v) getgenv().FilterNormal = v end })
FilterTab:Toggle({ Title = "Gold / Yellow (สีทอง/เหลือง)", Image = "target", Value = getgenv().FilterGold, Callback = function(v) getgenv().FilterGold = v end })
FilterTab:Toggle({ Title = "Purple / Pink (สีม่วง/ชมพู)", Image = "target", Value = getgenv().FilterPurple, Callback = function(v) getgenv().FilterPurple = v end })
FilterTab:Toggle({ Title = "Red (สีแดง)", Image = "target", Value = getgenv().FilterRed, Callback = function(v) getgenv().FilterRed = v end })
FilterTab:Toggle({ Title = "Blue (สีฟ้า/น้ำเงิน)", Image = "target", Value = getgenv().FilterBlue, Callback = function(v) getgenv().FilterBlue = v end })
FilterTab:Toggle({ Title = "Green (สีเขียว)", Image = "target", Value = getgenv().FilterGreen, Callback = function(v) getgenv().FilterGreen = v end })
FilterTab:Toggle({ Title = "Other Effects (สีขาวและอื่นๆ)", Image = "target", Value = getgenv().FilterOther, Callback = function(v) getgenv().FilterOther = v end })

-- Cloth Type Filters
FilterTab:Toggle({ Title = "Mitten (ถุงมือ)", Image = "target", Value = getgenv().FilterMitten, Callback = function(v) getgenv().FilterMitten = v end })
FilterTab:Toggle({ Title = "Sock (ถุงเท้า)", Image = "target", Value = getgenv().FilterSock, Callback = function(v) getgenv().FilterSock = v end })
FilterTab:Toggle({ Title = "Shirt (เสื้อ)", Image = "target", Value = getgenv().FilterShirt, Callback = function(v) getgenv().FilterShirt = v end })
FilterTab:Toggle({ Title = "Shorts (กางเกงขาสั้น)", Image = "target", Value = getgenv().FilterShorts, Callback = function(v) getgenv().FilterShorts = v end })
FilterTab:Toggle({ Title = "Sweater (สเวตเตอร์)", Image = "target", Value = getgenv().FilterSweater, Callback = function(v) getgenv().FilterSweater = v end })
FilterTab:Toggle({ Title = "Towel (ผ้าเช็ดตัว)", Image = "target", Value = getgenv().FilterTowel, Callback = function(v) getgenv().FilterTowel = v end })
FilterTab:Toggle({ Title = "Underpants (กางเกงใน)", Image = "target", Value = getgenv().FilterUnderpants, Callback = function(v) getgenv().FilterUnderpants = v end })

local ESPTab = Window:Tab({ Title = "ESP (มองทะลุ)", Icon = "eye" })

ESPTab:Toggle({ 
    Title = "ESP Clothes (เปิด/ปิด ESP ทั้งหมด)", 
    Image = "eye", 
    Value = getgenv().ClothESP, 
    Callback = function(val) 
        getgenv().ClothESP = val 
        if not val then
            for _, v in ipairs(workspace.Debris.Clothing:GetChildren()) do
                if v:FindFirstChild("LaundryESP") then
                    v.LaundryESP:Destroy()
                end
            end
        end
    end 
})

ESPTab:Toggle({ 
    Title = "Show Normal (แสดงผ้าธรรมดา)", 
    Image = "eye-off", 
    Value = getgenv().ESPNormal, 
    Callback = function(val) 
        getgenv().ESPNormal = val 
    end 
})

ESPTab:Toggle({ 
    Title = "Show Rare (แสดงผ้ามีระดับ)", 
    Image = "star", 
    Value = getgenv().ESPRare, 
    Callback = function(val) 
        getgenv().ESPRare = val 
    end 
})

local TeleportTab = Window:Tab({ Title = "Teleports", Icon = "map" })

TeleportTab:Button({
    Title = "วาร์ปไปร้านขายเครื่องซักผ้า",
    Desc = "ไปที่ Archy's Shop (ซื้อเครื่องซักผ้าใหม่)",
    Image = "shopping-cart",
    Callback = function()
        local char = game.Players.LocalPlayer.Character
        local shop = workspace:FindFirstChild("ArchysShopEntrance")
        if char and char:FindFirstChild("HumanoidRootPart") and shop and shop:FindFirstChild("Open") then
            char.HumanoidRootPart.CFrame = shop.Open.CFrame * CFrame.new(0, 3, 0)
        end
    end
})

-- // Services & Variables
local Events = game:GetService("ReplicatedStorage"):WaitForChild("Events")
local LocalPlayer = game.Players.LocalPlayer
local WashingMachinesInfo = require(game:GetService("ReplicatedStorage"):WaitForChild("Modules"):WaitForChild("WashingMachines"))

-- // Anti AFK (กันหลุดจากเกมเวลาฟาร์มนานๆ)
local VirtualUser = game:GetService("VirtualUser")
LocalPlayer.Idled:Connect(function()
    if getgenv().AntiAFK then
        VirtualUser:CaptureController()
        VirtualUser:ClickButton2(Vector2.new())
    end
end)

local function IsClothAllowed(cloth)
    -- ตรวจสอบประเภทของเสื้อผ้า
    local clothName = cloth.Name
    if clothName == "Mitten" and not getgenv().FilterMitten then return false end
    if clothName == "Sock" and not getgenv().FilterSock then return false end
    if clothName == "Shirt" and not getgenv().FilterShirt then return false end
    if clothName == "Shorts" and not getgenv().FilterShorts then return false end
    if clothName == "Sweater" and not getgenv().FilterSweater then return false end
    if clothName == "Towel" and not getgenv().FilterTowel then return false end
    if clothName == "Underpants" and not getgenv().FilterUnderpants then return false end

    -- ตรวจสอบความหายาก (สี)
    local hasEffect = false
    local cType = "Normal"
    for _, desc in ipairs(cloth:GetDescendants()) do
        if desc:IsA("ParticleEmitter") then
            hasEffect = true
            local color = desc.Color.Keypoints[1].Value
            local r, g, b = color.R, color.G, color.B
            if r > 0.8 and g > 0.8 and b > 0.8 then cType = "Other" 
            elseif r > 0.7 and g > 0.7 and b < 0.4 then cType = "Gold"
            elseif r > 0.7 and b > 0.7 and g < 0.4 then cType = "Purple"
            elseif r > 0.6 and g < 0.4 and b < 0.4 then cType = "Red"
            elseif g > 0.6 and r < 0.4 and b < 0.4 then cType = "Green"
            elseif b > 0.6 and r < 0.4 and g < 0.4 then cType = "Blue"
            else cType = "Other" end
            break
        end
    end
    
    if not hasEffect then return getgenv().FilterNormal end
    if cType == "Gold" then return getgenv().FilterGold end
    if cType == "Purple" then return getgenv().FilterPurple end
    if cType == "Red" then return getgenv().FilterRed end
    if cType == "Blue" then return getgenv().FilterBlue end
    if cType == "Green" then return getgenv().FilterGreen end
    return getgenv().FilterOther
end 

-- // Auto Standby at ConveyorEdge
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoGrab and not getgenv().IsSelling and not getgenv().IsWashing and getgenv().ActionState == "Grabbing" then
            pcall(function()
                if LocalPlayer.NonSaveVars.BackpackAmount.Value < LocalPlayer.NonSaveVars.BasketSize.Value then
                    local conveyor = workspace:FindFirstChild("ConveyorEdge")
                    local char = LocalPlayer.Character
                    if char and char:FindFirstChild("HumanoidRootPart") then
                        local targetPos
                        if conveyor then
                            if conveyor:FindFirstChild("MeshPart") and conveyor.MeshPart:IsA("BasePart") then
                                targetPos = conveyor.MeshPart.Position
                            elseif conveyor:IsA("Model") or conveyor:IsA("BasePart") then
                                targetPos = conveyor:GetPivot().Position
                            end
                        end
                        
                        if not targetPos then
                            for _, v in ipairs(workspace:GetDescendants()) do
                                if v.Name == "ConveyorEdge" then
                                    targetPos = v:GetPivot().Position
                                    break
                                end
                            end
                        end

                        if targetPos then
                            local dist = (char.HumanoidRootPart.Position - targetPos).Magnitude
                            if dist > 10 then
                                FlyToTarget(targetPos + Vector3.new(0, 3, 0))
                            end
                        end
                    end
                end
            end)
        end
    end
end)

-- // Auto Grab
-- Client-only: it reads LocalPlayer state and sends only GrabClothing requests.

local clothingFolder = workspace:WaitForChild("Debris"):WaitForChild("Clothing")
local queuedClothes = setmetatable({}, { __mode = "k" })
local pickupQueue = {}
local queueHead = 1
local queueTail = 0

-- Preserve the original pickup throughput for new clothes while avoiding spam.
local REQUEST_INTERVAL = 0.05
local RETRY_DELAY = 0.45
local IDLE_INTERVAL = 0.10

local function enqueueCloth(cloth)
    if not getgenv().AutoGrab or not cloth or cloth.Parent ~= clothingFolder or queuedClothes[cloth] then
        return
    end

    queuedClothes[cloth] = true
    queueTail = queueTail + 1
    pickupQueue[queueTail] = cloth
end

local function getNextCloth()
    while queueHead <= queueTail do
        local cloth = pickupQueue[queueHead]
        pickupQueue[queueHead] = nil
        queueHead = queueHead + 1
        if cloth then
            queuedClothes[cloth] = nil
        end

        if cloth and cloth.Parent == clothingFolder then
            return cloth
        end
    end

    -- Release processed entries instead of letting the queue grow during long sessions.
    pickupQueue = {}
    queueHead = 1
    queueTail = 0
    return nil
end

local childAddedConnection = clothingFolder.ChildAdded:Connect(enqueueCloth)

task.spawn(function()
    local wasAutoGrabEnabled = false

    while getgenv().LaundryFarmRunning do
        if not getgenv().AutoGrab then
            wasAutoGrabEnabled = false
            task.wait(IDLE_INTERVAL)
            continue
        end

        -- Scan existing clothes only once when Auto Grab is enabled.
        if not wasAutoGrabEnabled then
            wasAutoGrabEnabled = true
            for _, cloth in ipairs(clothingFolder:GetChildren()) do
                enqueueCloth(cloth)
            end
        end

        local ok, clothOrError = pcall(function()
            if LocalPlayer.NonSaveVars.BackpackAmount.Value >= LocalPlayer.NonSaveVars.BasketSize.Value then
                return nil
            end
            return getNextCloth()
        end)

        if not ok then
            if DebugLog then DebugLog("AutoGrab queue error: " .. tostring(clothOrError)) else warn("AutoGrab queue error: " .. tostring(clothOrError)) end
            task.wait(0.25)
            continue
        end

        local cloth = clothOrError
        if not cloth then
            task.wait(IDLE_INTERVAL)
            continue
        end

        local sent, sendError = pcall(function()
            Events.GrabClothing:FireServer(cloth)
        end)

        if not sent then
            if DebugLog then DebugLog("AutoGrab request error: " .. tostring(sendError)) else warn("AutoGrab request error: " .. tostring(sendError)) end
        end

        -- Requeue only after the server/replication has had time to remove the cloth.
        task.delay(sent and RETRY_DELAY or 0.25, function()
            if getgenv().LaundryFarmRunning and getgenv().AutoGrab and cloth.Parent == clothingFolder then
                enqueueCloth(cloth)
            end
        end)

        task.wait(REQUEST_INTERVAL)
    end

    childAddedConnection:Disconnect()
end)

local TweenService = game:GetService("TweenService")

local function GetMyPlot()
    local plots = workspace:FindFirstChild("Plots")
    if plots then
        for i = 1, 8 do
            local plot = plots:FindFirstChild("Plot" .. i)
            if plot then
                local sign = plot:FindFirstChild("Furniture") and plot.Furniture:FindFirstChild("Sign")
                if sign and sign:FindFirstChild("Main") and sign.Main:FindFirstChild("SurfaceGui") and sign.Main.SurfaceGui:FindFirstChild("TextLabel") then
                    if sign.Main.SurfaceGui.TextLabel.Text == LocalPlayer.Name .. "'s Plot" then
                        return plot
                    end
                end
            end
        end
    end
    return LocalPlayer.NonSaveVars.OwnsPlot.Value
end

local currentFlightId = 0
local function FlyToTarget(targetPosition)
    currentFlightId = currentFlightId + 1
    local myFlightId = currentFlightId
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return end
    local hrp = char.HumanoidRootPart
    local humanoid = char:FindFirstChildOfClass("Humanoid")
    
    if humanoid then
        humanoid.PlatformStand = true
        humanoid.Sit = false
    end
    
    local flyVelocity = hrp:FindFirstChild("AutoFarmFly") or Instance.new("BodyVelocity")
    flyVelocity.Name = "AutoFarmFly"
    flyVelocity.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
    flyVelocity.Parent = hrp
    
    local flyGyro = hrp:FindFirstChild("AutoFarmGyro") or Instance.new("BodyGyro")
    flyGyro.Name = "AutoFarmGyro"
    flyGyro.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
    flyGyro.P = 3000
    flyGyro.D = 500
    flyGyro.Parent = hrp
    
    local steppedConn
    steppedConn = game:GetService("RunService").Stepped:Connect(function()
        if char then
            for _, part in ipairs(char:GetDescendants()) do
                if part:IsA("BasePart") and part.CanCollide then
                    part.CanCollide = false
                end
            end
        end
        if humanoid and humanoid.Sit then
            humanoid.Sit = false
        end
    end)
    
    while char and hrp.Parent and (hrp.Position - targetPosition).Magnitude > 5 and currentFlightId == myFlightId do
        local dir = (targetPosition - hrp.Position).Unit
        flyVelocity.Velocity = dir * (getgenv().FlySpeed or 60)
        flyGyro.CFrame = CFrame.new(hrp.Position, targetPosition)
        task.wait()
    end
    
    if currentFlightId == myFlightId then
        if steppedConn then steppedConn:Disconnect() end
        flyVelocity:Destroy()
        flyGyro:Destroy()
        if humanoid then
            humanoid.PlatformStand = false
        end
        hrp.Velocity = Vector3.zero
        hrp.RotVelocity = Vector3.zero
    else
        if steppedConn then steppedConn:Disconnect() end
    end
end

local function GetRequiredClothes()
    local required = 0
    pcall(function()
        local plot = GetMyPlot()
        if plot and plot:FindFirstChild("WashingMachines") then
            local machines = plot.WashingMachines:GetChildren()
            local hasPartial = false
            
            -- หาว่ามีตู้ไหนที่ "ไม่เต็มแต่มีผ้าอยู่บ้าง" หรือไม่ ถ้ามีให้คำนวณจำนวนที่ขาดไปเป๊ะๆ
            for _, machine in ipairs(machines) do
                if machine:FindFirstChild("Config") then
                    local maxCap = WashingMachinesInfo[machine.Name].Capacity
                    local currentCap = machine.Config.Capacity.Value
                    local cycleFinished = machine.Config.CycleFinished.Value
                    if not cycleFinished and currentCap > 0 and currentCap < maxCap then
                        hasPartial = true
                        required = required + (maxCap - currentCap)
                    end
                end
            end
            
            -- ถ้าไม่มีตู้ที่ไม่เต็ม (ตู้ว่างทั้งหมด) ให้รวบรวมโควต้าของทุกตู้รวมกัน เพื่อโกยทีเดียว
            if not hasPartial then
                for _, machine in ipairs(machines) do
                    if machine:FindFirstChild("Config") then
                        local maxCap = WashingMachinesInfo[machine.Name].Capacity
                        local currentCap = machine.Config.Capacity.Value
                        local cycleFinished = machine.Config.CycleFinished.Value
                        
                        if cycleFinished or currentCap == 0 then
                            required = required + maxCap
                        end
                    end
                end
            end
        end
    end)
    return required
end

local function GetBackpackStatus()
    local currentAmount = LocalPlayer.NonSaveVars.BackpackAmount.Value
    local maxAmount = LocalPlayer.NonSaveVars.BasketSize.Value
    local status = LocalPlayer.NonSaveVars.BasketStatus.Value

    pcall(function()
        local gui = LocalPlayer:FindFirstChild("PlayerGui")
        if gui and gui:FindFirstChild("Info") and gui.Info:FindFirstChild("Frame") and gui.Info.Frame:FindFirstChild("Backpack") then
            local backpack = gui.Info.Frame.Backpack
            
            if backpack:FindFirstChild("Label") then
                local currentStr, maxStr = string.match(backpack.Label.Text, "(%d+)/(%d+)")
                if currentStr and maxStr then
                    currentAmount = tonumber(currentStr)
                    maxAmount = tonumber(maxStr)
                end
            end
            
            if backpack:FindFirstChild("Clean") and backpack.Clean.Visible then
                status = "Clean"
            elseif backpack:FindFirstChild("Dirty") and backpack.Dirty.Visible then
                status = "Dirty"
            elseif backpack:FindFirstChild("Empty") and backpack.Empty.Visible then
                status = "Empty"
            end
        end
    end)
    
    local requiredClothes = GetRequiredClothes()
    
    if currentAmount == 0 then
        getgenv().ActionState = "Grabbing"
        getgenv().LastGrabAmount = 0
        getgenv().LastGrabTime = tick()
    else
        if not getgenv().LastGrabAmount or currentAmount ~= getgenv().LastGrabAmount then
            getgenv().LastGrabAmount = currentAmount
            getgenv().LastGrabTime = tick()
        end
    end
    
    local timeSinceLastGrab = tick() - (getgenv().LastGrabTime or tick())
    local isStuckGrabbing = (timeSinceLastGrab > 5)

    if currentAmount == 0 then
        getgenv().ActionState = "Grabbing"
    elseif currentAmount >= maxAmount or (requiredClothes > 0 and currentAmount >= requiredClothes) or (not getgenv().AutoGrab and currentAmount > 0) or (isStuckGrabbing and currentAmount > 0) then
        getgenv().ActionState = "Emptying"
    end
    if not getgenv().ActionState then getgenv().ActionState = "Grabbing" end
    
    return currentAmount, maxAmount, status
end

-- // Auto Wash
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoWash and not getgenv().IsSelling then
            pcall(function()
                local plot = GetMyPlot()
                if plot and plot:FindFirstChild("WashingMachines") then
                    local machines = plot.WashingMachines:GetChildren()
                    
                    -- จัดลำดับความสำคัญ: เครื่องที่มีผ้าอยู่แล้วแต่ยังไม่เต็ม (เช่น 3/7) ให้ใส่ก่อน เพื่อกันมันตัดรอบทำงาน
                    table.sort(machines, function(a, b)
                        local aCap = a:FindFirstChild("Config") and a.Config.Capacity.Value or 0
                        local bCap = b:FindFirstChild("Config") and b.Config.Capacity.Value or 0
                        local aMax = a:FindFirstChild("Config") and WashingMachinesInfo[a.Name] and WashingMachinesInfo[a.Name].Capacity or 0
                        local bMax = b:FindFirstChild("Config") and WashingMachinesInfo[b.Name] and WashingMachinesInfo[b.Name].Capacity or 0
                        
                        local aPartial = (aCap > 0 and aCap < aMax and not a.Config.CycleFinished.Value)
                        local bPartial = (bCap > 0 and bCap < bMax and not b.Config.CycleFinished.Value)
                        
                        if aPartial and not bPartial then return true end
                        if bPartial and not aPartial then return false end
                        return false
                    end)
                    
                    for _, machine in ipairs(machines) do
                        if machine:FindFirstChild("Config") then
                            local cycleFinished = machine.Config.CycleFinished.Value
                            local amount, maxAmount, basketStatus = GetBackpackStatus()
                            local isBasketFull = (amount >= maxAmount)
                            
                            local currentCap = machine.Config.Capacity.Value
                            local maxCap = WashingMachinesInfo[machine.Name].Capacity
                            local isFull = currentCap >= maxCap
                            
                            local needUnload = cycleFinished and (basketStatus == "Clean" or amount == 0) and amount < maxAmount
                            -- เอาใส่ให้หมดค่อยเติม (สถานะ Emptying)
                            local needLoad = (not isFull) and (not cycleFinished) and (basketStatus ~= "Clean") and getgenv().ActionState == "Emptying" and amount > 0
                            
                            if needUnload or needLoad then
                                DebugLog("AutoWash: เครื่อง " .. machine.Name .. (needUnload and " เอาผ้าออก" or "") .. (needLoad and " เอาผ้าเข้า" or ""))
                                getgenv().IsWashing = true
                                local char = LocalPlayer.Character
                                if char and char:FindFirstChild("HumanoidRootPart") and machine:FindFirstChild("MAIN") then
                                    local hrp = char.HumanoidRootPart
                                    local targetCFrame = machine.MAIN.CFrame * CFrame.new(0, 3, 10)
                                    local dist = (hrp.Position - targetCFrame.Position).Magnitude
                                    
                                    if dist > 5 then
                                        FlyToTarget(targetCFrame.Position)
                                        task.wait(0.2)
                                    end
                                    
                                    if needUnload or needLoad then
                                        if firetouchinterest then
                                            firetouchinterest(hrp, machine.MAIN, 0)
                                            firetouchinterest(hrp, machine.MAIN, 1)
                                        end
                                    end

                                    if needUnload then
                                        Events.UnloadWashingMachine:FireServer(machine)
                                        task.wait(0.2)
                                    elseif needLoad then
                                        Events.LoadWashingMachine:FireServer(machine)
                                        task.wait(0.2)
                                    end
                                end
                                getgenv().IsWashing = false
                            end
                        end
                    end
                end
            end)
        end
    end
end)

-- // Auto Sell (Drop Clothes In Chute)
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoSell then
            pcall(function()
                local amount, maxAmount, basketStatus = GetBackpackStatus()
                if amount > 0 then
                    local isClean = (basketStatus == "Clean")
                    local shouldSell = false
                    
                    if isClean then
                        if getgenv().ActionState == "Emptying" then
                            shouldSell = true
                        else
                            local plot = GetMyPlot()
                            local moreToUnload = false
                            if plot and plot:FindFirstChild("WashingMachines") then
                                for _, machine in ipairs(plot.WashingMachines:GetChildren()) do
                                    if machine:FindFirstChild("Config") and machine.Config.CycleFinished.Value then
                                        moreToUnload = true
                                        break
                                    end
                                end
                            end
                            if not moreToUnload then
                                shouldSell = true
                            end
                        end
                    else
                        DebugLog("AutoSell: กระเป๋ามีผ้าสกปรกอยู่ จะไม่บินไปขาย (รอเครื่องซักผ้า)")
                    end
                    
                    if isClean and shouldSell then
                        DebugLog("AutoSell: กำลังบินไปขายผ้า")
                        getgenv().IsSelling = true
                        local char = LocalPlayer.Character
                        local chute = workspace:FindFirstChild("_FinishChute")
                        if char and char:FindFirstChild("HumanoidRootPart") and chute then
                            local targetPart = chute:IsA("BasePart") and chute or chute:FindFirstChildWhichIsA("BasePart")
                            if targetPart then
                                local hrp = char.HumanoidRootPart
                                local targetCFrame = targetPart.CFrame * CFrame.new(0, 3, 0)
                                
                                -- วาปไปหา (Ghost Fly)
                                FlyToTarget(targetCFrame.Position)
                                task.wait(0.2)
                                
                                if firetouchinterest then
                                    firetouchinterest(hrp, targetPart, 0)
                                    firetouchinterest(hrp, targetPart, 1)
                                end
                                
                                local dropEvent = Events:FindFirstChild("DropClothesInChute")
                                if dropEvent then
                                    dropEvent:FireServer()
                                    task.wait(0.5)
                                end
                            end
                        end
                        getgenv().IsSelling = false
                    end
                end
            end)
        end
    end
end)

-- // Auto Spin Wheel
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoSpin then
            pcall(function()
                local wheel = workspace.Debris.NPCVehicles:FindFirstChild("SpinTheWheel")
                if wheel and wheel:FindFirstChild("_ClickToSpin") then
                    if wheel.Timer.Value <= 0 and not wheel._ClickToSpin.Spun.Value then
                        Events.SpinTheWheel:InvokeServer()
                        task.wait(1.5)
                        Events.ClaimWheelAward:InvokeServer()
                    end
                end
            end)
        end
    end
end)

-- // Auto Buy Washing Machine
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoBuyMachine then
            pcall(function()
                local maxID = 1
                -- เช็คของในกระเป๋าว่ามีระดับไหน
                for _, v in pairs(LocalPlayer.SaveVars.Inventory:GetChildren()) do
                    local num = tonumber(v.Name)
                    if num and num > maxID then
                        maxID = num
                    end
                end
                -- เช็คที่อยู่บน Plot
                local plot = LocalPlayer.NonSaveVars.OwnsPlot.Value
                if plot and plot:FindFirstChild("WashingMachines") then
                    for _, machine in ipairs(plot.WashingMachines:GetChildren()) do
                        local num = tonumber(machine.Name)
                        if num and num > maxID then
                            maxID = num
                        end
                    end
                end
                -- พยายามซื้อรัวๆ จนกว่าจะซื้อไม่ได้ (เงินหมด หรือ ตัน)
                local nextID = maxID + 1
                while nextID <= 100 do
                    local success = game:GetService("ReplicatedStorage").Events.BuyWashingMachine:InvokeServer(tostring(nextID))
                    if success then
                        nextID = nextID + 1
                        task.wait(0.1)
                    else
                        break
                    end
                end
            end)
        end
    end
end)

-- // Auto Equip Best Machine
local lastEquipConfig = ""
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoEquipMachine then
            pcall(function()
                local availableMachines = {}
                -- เอาเครื่องในกระเป๋ามารวม
                for _, v in pairs(LocalPlayer.SaveVars.Inventory:GetChildren()) do
                    local num = tonumber(v.Name)
                    if num and v.Value > 0 then
                        for i = 1, v.Value do table.insert(availableMachines, num) end
                    end
                end
                -- เอาเครื่องบน Plot มารวม
                for _, v in pairs(LocalPlayer.SaveVars.Plot:GetChildren()) do
                    local num = tonumber(v.Name)
                    if num then
                        table.insert(availableMachines, num)
                    end
                end
                
                -- เรียงจากระดับสูงสุดไปต่ำสุด
                table.sort(availableMachines, function(a, b) return a > b end)
                
                local currentConfig = ""
                for i = 1, 8 do
                    if availableMachines[i] then
                        currentConfig = currentConfig .. availableMachines[i] .. ","
                    end
                end
                
                -- อัปเดตเมื่อมีเครื่องระดับสูงกว่าให้วาง
                if currentConfig ~= lastEquipConfig then
                    for i = 1, 8 do
                        if availableMachines[i] then
                            game:GetService("ReplicatedStorage").Events.PlaceWashingMachine:InvokeServer(tostring(availableMachines[i]), i)
                            task.wait(0.1)
                        end
                    end
                    lastEquipConfig = currentConfig
                end
            end)
        end
    end
end)

-- // Auto Buy Basket
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoBuyBasket then
            pcall(function()
                local maxID = 1
                for _, v in pairs(LocalPlayer.SaveVars.Baskets:GetChildren()) do
                    local num = tonumber(v.Name)
                    if num and num > maxID then
                        maxID = num
                    end
                end
                
                -- พยายามซื้อตะกร้ารัวๆ จนกว่าจะซื้อไม่ได้ (เงินหมด หรือ ตัน)
                local nextID = maxID + 1
                while nextID <= 100 do
                    local success = game:GetService("ReplicatedStorage").Events.BuyBasket:InvokeServer(tostring(nextID))
                    if success then
                        nextID = nextID + 1
                        task.wait(0.1)
                    else
                        break
                    end
                end
            end)
        end
    end
end)

-- // Noclip
game:GetService("RunService").Stepped:Connect(function()
    if getgenv().Noclip then
        local char = game.Players.LocalPlayer.Character
        if char then
            for _, part in ipairs(char:GetDescendants()) do
                if part:IsA("BasePart") and part.CanCollide then
                    part.CanCollide = false
                end
            end
        end
    end
end)

-- // Auto Claim Challenges
task.spawn(function()
    while task.wait() do if not getgenv().LaundryFarmRunning then break end
        if getgenv().AutoChallenge then
            pcall(function()
                local ChallengesData = require(game:GetService("ReplicatedStorage").Modules.Challenges)
                local GetChallenges = game:GetService("ReplicatedStorage").Events.Challenges.GetChallenges
                local ClaimChallenge = game:GetService("ReplicatedStorage").Events.Challenges.ClaimChallenge
                
                local activeChallenges = GetChallenges:InvokeServer()
                if activeChallenges then
                    for _, v in pairs(activeChallenges) do
                        if not v.Claimed then
                            local goal = 1
                            if ChallengesData.Easy and ChallengesData.Easy[v.ID] then
                                goal = ChallengesData.Easy[v.ID].Goal
                            elseif ChallengesData.Medium and ChallengesData.Medium[v.ID] then
                                goal = ChallengesData.Medium[v.ID].Goal
                            elseif ChallengesData.Hard and ChallengesData.Hard[v.ID] then
                                goal = ChallengesData.Hard[v.ID].Goal
                            elseif ChallengesData[v.ID] then
                                goal = ChallengesData[v.ID].Goal
                            end
                            
                            if v.Progress >= goal then
                                ClaimChallenge:InvokeServer(v.ID)
                                task.wait(0.5)
                            end
                        end
                    end
                end
            end)
        end
    end
end)

-- // ESP Loop
task.spawn(function()
    while task.wait(0.5) do if not getgenv().LaundryFarmRunning then break end
        if getgenv().ClothESP then
            pcall(function()
                for _, cloth in ipairs(workspace.Debris.Clothing:GetChildren()) do
                    local specialTag = cloth:FindFirstChild("SpecialTag")
                    local isRare = specialTag ~= nil
                    
                    local shouldShow = true
                    if isRare and not getgenv().ESPRare then shouldShow = false end
                    if not isRare and not getgenv().ESPNormal then shouldShow = false end
                    
                    local existingESP = cloth:FindFirstChild("LaundryESP")
                    
                    if shouldShow then
                        if not existingESP then
                            local text = "Normal " .. cloth.Name
                            local color = Color3.fromRGB(255, 255, 255) -- White
                            
                            if isRare then
                                local lvl = specialTag.Value
                                text = "Rare " .. cloth.Name .. " (Lv." .. tostring(lvl) .. ")"
                                
                                local RarityColors = {
                                    Color3.fromRGB(150, 255, 150), -- 1 Green
                                    Color3.fromRGB(100, 200, 255), -- 2 Blue
                                    Color3.fromRGB(200, 100, 255), -- 3 Purple
                                    Color3.fromRGB(255, 100, 100), -- 4 Red
                                    Color3.fromRGB(255, 215, 0),   -- 5 Gold
                                    Color3.fromRGB(255, 150, 0),   -- 6 Orange
                                    Color3.fromRGB(255, 50, 200),  -- 7 Pink
                                }
                                local num = tonumber(lvl)
                                if num then
                                    local index = ((num - 1) % #RarityColors) + 1
                                    color = RarityColors[index]
                                else
                                    color = Color3.fromRGB(255, 215, 0)
                                end
                            end
                            
                            local billboard = Instance.new("BillboardGui")
                            billboard.Name = "LaundryESP"
                            billboard.Adornee = cloth
                            billboard.Size = UDim2.new(0, 150, 0, 50)
                            billboard.StudsOffset = Vector3.new(0, 2, 0)
                            billboard.AlwaysOnTop = true
                            
                            local textLabel = Instance.new("TextLabel")
                            textLabel.Parent = billboard
                            textLabel.BackgroundTransparency = 1
                            textLabel.Size = UDim2.new(1, 0, 1, 0)
                            textLabel.Text = text
                            textLabel.TextColor3 = color
                            textLabel.TextStrokeTransparency = 0
                            textLabel.TextScaled = true
                            textLabel.Font = Enum.Font.GothamBold
                            
                            billboard.Parent = cloth
                        end
                    else
                        if existingESP then
                            existingESP:Destroy()
                        end
                    end
                end
            end)
        else
            -- เคลียร์ป้ายเก่าเวลาปิดสวิตช์หลัก
            for _, cloth in ipairs(workspace.Debris.Clothing:GetChildren()) do
                if cloth:FindFirstChild("LaundryESP") then
                    cloth.LaundryESP:Destroy()
                end
            end
        end
    end
end)
