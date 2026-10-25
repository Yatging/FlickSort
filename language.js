(function () {
  "use strict";

  const STORAGE_KEY = "flicksort-language";
  const entries = [
    ["The current study uses clear bus and passenger-car recognition tasks to compare Classic controls with FlickSort gestures. Responses stay on your device until you export the CSV files.", "当前研究使用明确的巴士与小汽车识别任务，对比 Classic 控件与 FlickSort 手势。数据会保留在你的设备中，直到你导出 CSV。"],
    ["The current study tests the image-selection interaction using clear object-presence tasks. It compares Classic controls with FlickSort gestures; responses stay on your device until you export the CSV files.", "当前研究通过明确的物体存在判断任务测试图片选择器交互，对比 Classic 控件与 FlickSort 手势；数据会保留在你的设备中，直到你导出 CSV。"],
    ["CURRENT STUDY · 当前正式测试入口", "当前研究 · 正式测试入口"],
    ["Start the vehicle study", "开始车辆识别测试"],
    ["Choose Classic or FlickSort, then run the short Demo or the complete Pilot with tutorial, 24 classification trials, navigation tasks and a screenshot-ready result.", "选择 Classic 或 FlickSort，然后进行简短 Demo 或完整 Pilot；完整流程包含教程、24 个分类试次、导航任务和便于截图的结果页。"],
    ["Start the image-selection study", "开始图片选择器测试"],
    ["Run the short Demo or the complete Pilot. Classic and FlickSort are assigned automatically, start in randomized order and alternate across the same photos.", "进行简短 Demo 或完整 Pilot。Classic 与 FlickSort 会自动分配，随机决定起始方式，并在同一组图片中交替出现。"],
    ["LEGACY INTERFACE SHOWCASE", "旧版界面展示"],
    ["Original demos", "原版 Demo"],
    ["These two pages are retained only to demonstrate the earlier interface. Do not use them for the current study or new participant data.", "以下两个页面仅用于展示早期界面，请勿用于当前研究或收集新的参与者数据。"],
    ["DEMO ONLY · ORIGINAL CONTROL", "仅供展示 · 原版对照界面"],
    ["Classic gallery", "Classic 图库"],
    ["Earlier gallery prototype with four visible classification buttons.", "早期图库原型，使用四个可见分类按钮。"],
    ["Open display demo →", "打开展示 Demo →"],
    ["DEMO ONLY · ORIGINAL INTERACTION", "仅供展示 · 原版交互界面"],
    ["FlickSort gestures", "FlickSort 手势"],
    ["Earlier gesture prototype retained to show the original interaction and animation.", "保留早期手势原型，用于展示原始交互与动画。"],
    ["Use anonymous participant IDs only.", "请只使用匿名参与者编号。"], ["· Use anonymous participant IDs only.", "· 请只使用匿名参与者编号。"],
    ["FlickSort V3 · Research / Pilot Testing ·", "FlickSort V3 · 研究 / Pilot 测试 ·"],

    ["Same gallery.", "同一个图库。"], ["Different interaction.", "不同的交互。"],
    ["Mobile-first photo culling prototypes for the FlickSort controlled experiment.", "为 FlickSort 受控实验设计的移动优先图片筛选原型。"],
    ["01   Classic buttons", "01   Classic 按钮"], ["02   FlickSort gestures", "02   FlickSort 手势"],
    ["THIS VERSION", "当前版本"], ["Tap to classify", "点击分类"], ["Swipe to classify", "滑动分类"],
    ["Swipe horizontally to browse. Four visible buttons assign the photo's category.", "左右滑动浏览，使用四个可见按钮为图片分类。"],
    ["Swipe horizontally to browse. Four diagonal gestures directly assign a category.", "左右滑动浏览，使用四个对角手势直接分类。"],
    ["← Next", "← 下一张"], ["→ Previous", "→ 上一张"], ["Tap to tag", "点击标记"], ["↗ ↖ ↙ ↘ to tag", "↗ ↖ ↙ ↘ 分类"],
    ["Identical pictures, labels, navigation and data capture in both versions.", "两个版本使用完全相同的图片、标签、导航和数据记录。"],
    ["Classic gallery", "Classic 图库"], ["Directional gesture", "方向手势"],
    ["YOUR LIBRARY", "你的图库"], ["Every shot has a story.", "每张图片都有故事。"],
    ["Swipe sideways to browse. Tap a label below to sort.", "左右滑动浏览，点击下方标签进行分类。"],
    ["Browse sideways. Swipe diagonally to sort.", "左右浏览，对角滑动分类。"],
    ["← NEXT", "← 下一张"], ["PREVIOUS →", "上一张 →"], ["Undo", "撤销"],
    ["CLASSIFY PHOTO", "为图片分类"], ["GESTURE TO CLASSIFY", "用手势分类"],
    ["Keep", "保留"], ["Edit", "编辑"], ["Maybe", "待定"], ["Reject", "拒绝"],
    ["No long press. Just swipe from the photo.", "无需长按，直接从图片上滑动。"],
    ["FlickSort study home", "FlickSort 测试首页"], ["Current classification rules", "当前分类规则"], ["Reason for undo", "撤销原因"],
    ["Show gesture guide", "显示手势指南"], ["Help", "帮助"], ["Close", "关闭"], ["Undo last classification", "撤销上一次分类"], ["Source on GitHub", "GitHub 源码"],
    ["Sample photograph", "示例图片"], ["Controlled vehicle scene", "可控车辆场景"], ["Nearby photos", "附近图片"], ["Current photo", "当前图片"],
    ["Photo viewer; swipe left to next photo, right to previous", "图片浏览器；左滑下一张，右滑上一张"],
    ["Photo viewer; swipe left to next photo, right to previous; diagonally toward a colored corner to classify", "图片浏览器；左滑下一张、右滑上一张；向彩色角落对角滑动进行分类"],
    ["Finish this trial", "完成本试次"], ["Submit when ready", "准备好后提交"], ["Submit", "提交"],
    ["All photos", "全部图片"], ["Start test", "开始测试"], ["Export log", "导出日志"],
    ["EXPERIMENT DASHBOARD", "实验面板"], ["Interaction,", "交互，"], ["not interface.", "而非界面。"],
    ["LIVE EVENT", "实时事件"], ["Waiting for an action…", "等待操作…"],
    ["For study runs, assign a participant ID and navigation-demand condition, then export trial and event data.", "进行测试时，请设置参与者编号和导航需求条件，然后导出试次与事件数据。"],
    ["Configure a study run →", "配置测试 →"],
    ["Prototype data only. The included images are local sample assets; replace and counterbalance before final participant collection.", "仅供原型测试。内置图片是本地示例素材，正式收集参与者数据前必须替换并进行平衡。"],
    ["FLICKSORT LAB", "FLICKSORT 实验室"], ["Set up a study run", "设置测试"],
    ["Next photo", "下一张图片"], ["Previous photo", "上一张图片"], ["No action", "无操作"], ["Browse", "浏览"],
    ["Release to cancel", "松手取消"], ["Release to classify", "松手分类"],
    ["Use buttons to classify", "使用按钮分类"], ["Keep moving…", "继续滑动…"], ["Change direction or release", "改变方向或松手"], ["Swipe farther", "再滑远一些"],
    ["No study data yet", "尚无测试数据"], ["End of gallery", "已到图库末端"], ["Nothing to undo", "没有可撤销的操作"], ["Undone", "已撤销"],
    ["STUDY FINISHED", "测试已完成"], ["Thanks for testing.", "感谢参与测试。"], ["Your data is ready to export.", "数据已可导出。"], ["New test", "新测试"],
    ["PRACTICE · NOT SCORED", "练习 · 不计分"], ["Navigate only", "仅导航"], ["Finish navigation probe", "完成导航任务"],
    ["Submit at target photo", "到达目标图片后提交"], ["Use Submit after choosing a category", "选择分类后点击提交"], ["Testing…", "测试中…"],
    ["Practice · four trials", "练习 · 四个试次"], ["Ready for the main study", "准备开始正式测试"],
    ["Practice is complete. Your scored trials start next. No correctness feedback will be shown during the main block.", "练习已完成，接下来开始计分试次。正式阶段不会显示正确或错误反馈。"],
    ["Begin scored trials →", "开始计分试次 →"], ["Configure a study run", "配置测试"],
    ["Warning:", "警告："], ["Starting a new run clears the active run. Export current data first.", "开始新测试会清除当前测试，请先导出数据。"],
    ["Use the same participant ID across both versions. Each run tests one Technique × Navigation Demand condition.", "两个版本请使用相同的参与者编号。每次运行测试一个“技术 × 导航需求”条件。"],
    ["Participant ID (anonymous)", "参与者编号（匿名）"], ["Navigation Demand", "导航需求"],
    ["Low — sequential browsing", "低 — 顺序浏览"], ["High — repeated forward/back navigation", "高 — 多次前后导航"],
    ["Counterbalancing group", "平衡顺序组"], ["Trial batches (prototype)", "试次批次（原型）"],
    ["1 batch · 12 tasks + 4 navigation probes", "1 批 · 12 个任务 + 4 个导航试次"], ["3 batches · 36 tasks + 4 navigation probes", "3 批 · 36 个任务 + 4 个导航试次"],
    ["Pilot mode: uses 24 bundled illustrative photos. Expand and counterbalance photo sets before formal data collection.", "Pilot 模式使用 24 张内置示例图片。正式收集数据前，请扩展素材并进行平衡。"],
    ["Start practice →", "开始练习 →"], ["Discard current study run? Please export first if needed.", "要放弃当前测试吗？如需数据请先导出。"],
    ["Study block complete", "测试区块已完成"], ["Classifications", "分类数"], ["Avg. trial time", "平均试次时间"], ["Final errors", "最终错误"],
    ["Navigation probes:", "导航试次："], ["Configure another condition →", "配置其他条件 →"],
    ["The result summary is descriptive. No automatic statistical conclusion is produced by this prototype.", "本结果仅作描述，本原型不会自动生成统计结论。"],
    ["Export study data", "导出测试数据"], ["All data stay in this browser until you export them. Export after every participant × condition block.", "所有数据会留在此浏览器中，直到你导出。每个“参与者 × 条件”区块完成后都应导出。"],
    ["Trials CSV", "试次 CSV"], ["Events CSV", "事件 CSV"],
    ["The events CSV contains gesture vectors, angular decisions and classifications. The trials CSV contains task times and correctness. Data are not transmitted to a server.", "事件 CSV 包含手势向量、角度判定和分类；试次 CSV 包含任务时间与正确率。数据不会上传至服务器。"],
    ["Normal horizontal swipes always navigate photos. A category is applied to the currently displayed picture.", "水平滑动始终用于浏览图片，分类会应用到当前显示的图片。"],
    ["Tap ✓ Keep", "点击 ✓ 保留"], ["Tap ✎ Edit", "点击 ✎ 编辑"], ["Tap ? Maybe", "点击 ? 待定"], ["Tap × Reject", "点击 × 拒绝"],
    ["Tap one of the four buttons under the photo.", "点击图片下方的四个按钮之一。"],
    ["No long-press or mode switch is needed for an individual photo. Touch and swipe diagonally; release to confirm. Short or unclear strokes cancel safely.", "单张图片无需长按或切换模式。触摸后沿对角线滑动，松手确认；过短或方向不清的手势会安全取消。"],
    ["Undo restores the previously assigned category. Reject never deletes any file. Desktop: drag with a mouse to simulate swipes, or use ←/→ arrow keys when outside a study run.", "撤销会恢复之前的分类；拒绝不会删除文件。桌面端可用鼠标拖动模拟滑动，非测试状态下也可使用 ←/→ 方向键。"],
    ["Got it", "明白了"], ["Grid disabled during study", "测试期间不可打开网格"], ["All sample photos", "全部示例图片"],
    ["Tap any image to open it in the gallery. Photos are bundled for offline demo use.", "点击任意图片在图库中打开。图片已内置，可离线用于 Demo。"],
    ["Gesture not recognized", "未识别该手势"], ["Photo file unavailable", "图片文件不可用"],

    ["IMAGE SELECTION INTERACTION STUDY", "图片选择器交互测试"], ["Sort photos.", "为图片分类。"], ["Compare interactions.", "比较两种交互。"],
    ["This test compares two ways to classify the same controlled photos: Classic buttons and FlickSort gestures. The website assigns them automatically and alternates them by photo.", "本测试比较两种对相同可控图片进行分类的方式：Classic 按钮与 FlickSort 手势。网页会自动分配，并按图片交替使用。"],
    ["You do not choose a technique.", "无需选择操作方式。"], ["Each chapter starts with a randomly selected technique, then alternates Classic and FlickSort. You may process the photos in any order.", "每章会随机决定起始操作方式，随后 Classic 与 FlickSort 交替出现；图片可按任意顺序处理。"],
    ["Automatic mixed-technique run", "自动混合操作测试"], ["Classic and FlickSort alternate; the starting technique is randomized.", "Classic 与 FlickSort 交替使用，起始操作方式随机决定。"], ["MIXED · AUTO", "混合 · 自动"],
    ["CITY VEHICLE RECOGNITION STUDY", "城市车辆识别测试"], ["One picture.", "一张图片。"], ["One clear rule.", "一条明确规则。"],
    ["A standalone CAPTCHA-style test using original, controlled illustrations. The Classic and FlickSort conditions use exactly the same images, answers, levels and instructions.", "使用原创、可控插图的独立 CAPTCHA 式测试。Classic 与 FlickSort 条件采用完全相同的图片、答案、关卡和说明。"],
    ["No photography terms.", "无需摄影术语。"], ["Count every visible bus and ordinary passenger car, even if it is small or partly near an edge.", "所有可见的巴士和普通小汽车都要计算，即使物体较小或靠近图片边缘。"],
    ["NEW STUDY RUN", "新测试"], ["Local data only", "仅本地数据"], ["Anonymous participant ID", "匿名参与者编号"],
    ["Technique", "技术"], ["Tap four buttons", "点击四个按钮"], ["Diagonal gestures", "对角手势"], ["Run", "模式"],
    ["Demo", "演示"], ["4 tasks + 2 navigation", "4 个任务 + 2 个导航"], ["Full pilot", "完整 Pilot"], ["Tutorial + 24 + 4 navigation", "教程 + 24 个分类 + 4 个导航"],
    ["Provisional demonstration benchmark; not pilot-validated.", "暂定演示基准，尚未通过 pilot 验证。"], ["Start", "开始"],
    ["Responses stay in this browser until you download the CSV files.", "数据会保留在此浏览器中，直到你下载 CSV 文件。"],
    ["Tutorial", "教程"], ["Not scored", "不计分"], ["Level 1", "关卡 1"], ["Bus or no bus", "有无巴士"], ["Level 2", "关卡 2"], ["Vehicle sorting", "车辆分类"],
    ["Navigation", "导航"], ["No classification", "不分类"], ["Results", "结果"], ["Screenshot + CSV", "截图 + CSV"], ["End this local run", "结束本地测试"],
    ["TUTORIAL · NOT SCORED", "教程 · 不计分"], ["Learn the controls", "学习操作"], ["Follow the instruction below. Correct answers are shown only during practice.", "请按照下方指令操作；只有练习阶段会显示正确答案。"],
    ["LEVEL 1 · BUS CHECK", "关卡 1 · 巴士判断"], ["Keep photos with a bus. Reject all others.", "保留所有含有巴士的图片，拒绝其余图片。"],
    ["DEMO · 4 REPRESENTATIVE PHOTOS", "DEMO · 4 张代表性图片"], ["LEVEL 2 · FOUR-WAY SORT", "关卡 2 · 四分类"], ["Sort every photo by visible vehicles.", "根据可见车辆为每张图片分类。"],
    ["Find the requested photo. Do not classify.", "找到指定图片，不要进行分类。"],
    ["FlickSort: swipe diagonally toward the category shown in the rule card.", "FlickSort：朝规则卡所示类别的对角方向滑动。"], ["FlickSort: ↖ Edit, ↗ Keep, ↙ Maybe, ↘ Reject.", "FlickSort：↖ 编辑、↗ 保留、↙ 待定、↘ 拒绝。"], ["FlickSort: a short or unclear diagonal swipe cancels safely.", "FlickSort：过短或方向不清的对角滑动会安全取消。"], ["FlickSort: classify this photo, then press Submit for practice feedback.", "FlickSort：为当前图片分类，然后点击提交查看练习反馈。"],
    ["Classic: tap one of the four category buttons below the photo.", "Classic：点击图片下方四个分类按钮之一。"], ["Classic: use the rule card, then tap the matching category.", "Classic：根据规则卡判断，然后点击对应类别。"], ["Classic: Undo can correct an accidental button tap.", "Classic：可用撤销纠正意外点击。"], ["Classic: classify this photo, then press Submit for practice feedback.", "Classic：为当前图片分类，然后点击提交查看练习反馈。"],
    ["For every photo: if any bus is visible, choose Keep. If no bus is visible, choose Reject.", "处理每张图片：只要看见任何巴士，就选择“保留”；没有巴士，就选择“拒绝”。"],
    ["Classify every photo: bus only → Keep; car only → Edit; both → Maybe; neither → Reject.", "为每张图片分类：只有巴士 → 保留；只有小汽车 → 编辑；两者都有 → 待定；两者都没有 → 拒绝。"],
    ["CURRENT TASK", "当前任务"], ["Follow the instruction above.", "请按照上方任务指示操作。"],
    ["Finish every photo; you may work in any order.", "完成所有图片；可以按任意顺序处理。"], ["All photos are classified. Review freely or submit this chapter.", "所有图片均已分类；你可以自由检查或提交本章。"], ["Submit chapter", "提交本章"],
    ["DEMO · 4 REPRESENTATIVE TASKS", "DEMO · 4 个代表性任务"], ["Vehicle sorting demo", "车辆分类演示"], ["LEVEL 1 · 12 IMAGES", "关卡 1 · 12 张图片"], ["City Trip Cleanup", "城市出行整理"], ["LEVEL 2 · 12 IMAGES", "关卡 2 · 12 张图片"], ["City Vehicle Sorting", "城市车辆分类"], ["NAVIGATION ONLY", "仅导航"], ["Find the named picture", "找到指定图片"],
    ["Swipe ← next and → previous. Diagonal ↗ means Keep.", "左滑 ← 下一张，右滑 → 上一张；右上 ↗ 表示保留。"],
    ["Diagonal ↖ means Edit. Undo can mark an accidental input.", "左上 ↖ 表示编辑；撤销时可标记意外输入。"],
    ["Diagonal ↙ means Maybe. A short or unclear swipe cancels safely.", "左下 ↙ 表示待定；过短或方向不清的滑动会安全取消。"],
    ["Diagonal ↘ means Reject. Practice shows answer feedback.", "右下 ↘ 表示拒绝；练习阶段会显示答案反馈。"],
    ["Swipe ← next and → previous. Tap Keep for bus only.", "左滑 ← 下一张，右滑 → 上一张；只有巴士时点击保留。"],
    ["Tap Edit for car only. Undo can mark an accidental input.", "只有小汽车时点击编辑；撤销时可标记意外输入。"],
    ["Tap Maybe when both are visible. Gesture cancel is not used in Classic.", "两者都可见时点击待定；Classic 不使用手势取消。"],
    ["Tap Reject for neither. Practice shows answer feedback.", "两者都没有时点击拒绝；练习阶段会显示答案反馈。"],
    ["Bus visible", "有巴士"], ["Car only", "只有小汽车"], ["Bus + car", "巴士 + 小汽车"], ["Neither", "两者都没有"],
    ["Undo reason…", "撤销原因…"], ["Content rethink", "重新判断内容"], ["Accidental input", "意外输入"],
    ["Release after a diagonal swipe · no long press", "沿对角线滑动后松手 · 无需长按"], ["Choose one category", "选择一个分类"], ["Then submit your final answer.", "然后提交最终答案。"],
    ["FLICKSORT IMAGE SELECTION STUDY", "FLICKSORT 图片选择器测试"], ["Results / 结果", "结果"], ["Participant", "参与者"], ["Asset set", "素材集"], ["Mixed · auto-alternating", "混合 · 自动交替"],
    ["总分 / OVERALL SCORE", "总分"], ["Demo preview", "Demo 预览"], ["Provisional demonstration benchmark · T_ref 180s", "暂定演示基准 · T_ref 180 秒"],
    ["准确率 / Accuracy", "准确率"], ["主动用时 / Active time", "主动用时"], ["取消 / Cancels", "取消次数"], ["撤销 / Undo", "撤销次数"], ["导航误触 / Nav miscues", "导航误触"], ["正确到达 / Nav correct", "正确到达"],
    ["Cancels and Undo are shown separately but are not included in the score: gesture cancellation is technique-specific, and Undo can be reasonable error correction. Formal analysis must use time, accuracy and error measures separately—not the overall score alone.", "取消与撤销会单独显示，但不计入总分：手势取消只发生在特定技术中，而撤销可能是合理纠错。正式分析必须分别使用时间、准确率和错误指标，不能只使用总分。"],
    ["Download trials CSV", "下载试次 CSV"], ["Download events CSV", "下载事件 CSV"], ["Start another run", "开始新测试"],
    ["Bus visible / 有巴士", "有巴士"], ["Not used / 不使用", "不使用"], ["No bus / 无巴士", "没有巴士"], ["Bus only / 只有巴士", "只有巴士"], ["Car only / 只有小汽车", "只有小汽车"], ["Bus + car / 两者都有", "两者都有"], ["Neither / 两者都没有", "两者都没有"],
    ["Navigation only / 仅导航", "仅导航"], ["Navigation only", "仅导航"], ["Submit when the target picture is visible.", "显示目标图片后提交。"], ["I’m there", "已到达"],
    ["Swipe left or right until L1-03 is visible. Do not classify any photo.", "左右滑动，直到显示 L1-03；不要为任何图片分类。"],
    ["Swipe left or right until L2-05 is visible. Do not classify any photo.", "左右滑动，直到显示 L2-05；不要为任何图片分类。"],
    ["Swipe left or right until L1-10 is visible. Do not classify any photo.", "左右滑动，直到显示 L1-10；不要为任何图片分类。"],
    ["Swipe left or right until L2-09 is visible. Do not classify any photo.", "左右滑动，直到显示 L2-09；不要为任何图片分类。"],
    ["Reach the target photo WITHOUT classifying any photo.", "到达目标图片，期间不要对任何图片分类。"],
    ["Practice feedback appears after Submit.", "提交后会显示练习反馈。"], ["No correctness feedback is shown during scored trials.", "计分试次不会显示正确或错误反馈。"],
    ["Navigation only — classification counted as a miscue", "仅限导航——本次分类已计为导航误触"], ["Return to the TARGET image before classifying", "请返回目标图片后再分类"],
    ["Choose a category first", "请先选择分类"], ["Return to the TARGET image before submitting", "请返回目标图片后再提交"], ["Correct / 正确", "正确"], ["Gesture cancelled / 手势已取消", "手势已取消"],
    ["Pilot overview", "Pilot 概览"], ["Demo preview · not comparable", "Demo 预览 · 不可直接比较"],
    ["Study assets could not load.", "测试素材无法加载。"], ["Serve this folder over HTTP (for example GitHub Pages) instead of opening the file directly.", "请通过 HTTP（例如 GitHub Pages）提供此文件夹，不要直接打开本地文件。"],

    ["Stimulus review sheet", "素材核对表"], ["Asset set:", "素材集："], ["24 original deterministic illustrations.", "24 张原创确定性插图。"], ["· 24 original deterministic illustrations.", "· 24 张原创确定性插图。"],
    ["24 original photorealistic stimuli.", "24 张原创写实测试素材。"], ["· 24 original photorealistic stimuli.", "· 24 张原创写实测试素材。"],
    ["the implementation agent checked all generated crops against their labels. Independent human review is still required before formal data collection; this page does not mark that review complete.", "实现代理已逐张核对生成裁切图与标签。正式收集数据前仍需独立真人复核；本页不会将该复核标记为已完成。"],
    ["Status:", "状态："], ["generator inputs and browser rendering have been checked by the implementation agent. Independent human review is still required before formal data collection; this page does not mark that review complete.", "实现代理已检查生成器输入与浏览器渲染。正式收集数据前仍需独立真人复核；本页不会将该复核标记为已完成。"],
    ["Print / Save review sheet", "打印 / 保存核对表"], ["Independent human review: PENDING", "独立真人复核：待完成"],
    ["One clearly visible bus; no passenger car.", "一辆清晰可见的巴士；没有小汽车。"],
    ["One clearly visible passenger car; no bus.", "一辆清晰可见的小汽车；没有巴士。"],
    ["A bicycle and bench; no bus or passenger car.", "自行车和长椅；没有巴士或小汽车。"], ["A bicycle and kiosk; no bus or passenger car.", "自行车和小亭；没有巴士或小汽车。"],
    ["A bench and waterfront; no bus or passenger car.", "长椅和滨水区域；没有巴士或小汽车。"], ["A fountain and pedestrian plaza; no bus or passenger car.", "喷泉和步行广场；没有巴士或小汽车。"],
    ["A single clearly visible bus; no passenger car.", "一辆清晰可见的巴士；没有小汽车。"],
    ["A single clearly visible passenger car; no bus.", "一辆清晰可见的小汽车；没有巴士。"],
    ["A bench, trees and bicycle; no bus or passenger car.", "长椅、树木和自行车；没有巴士或小汽车。"],
    ["Trees, a bench and bicycle; no bus or passenger car.", "树木、长椅和自行车；没有巴士或小汽车。"],
    ["A bicycle, trees and kiosk; no bus or passenger car.", "自行车、树木和小亭；没有巴士或小汽车。"],
    ["Bus only; no passenger car.", "只有巴士；没有小汽车。"],
    ["Passenger car only; no bus.", "只有小汽车；没有巴士。"],
    ["One bus and one passenger car, both clearly visible.", "一辆巴士和一辆小汽车，两者都清晰可见。"],
    ["A bicycle and street furniture; no bus or passenger car.", "自行车和街道设施；没有巴士或小汽车。"],
    ["A fountain, bench and trees; no bus or passenger car.", "喷泉、长椅和树木；没有巴士或小汽车。"],
    ["Planters, bollards and a kiosk; no bus or passenger car.", "花槽、路桩和小亭；没有巴士或小汽车。"],
    ["Bus:", "巴士："], ["Car:", "小汽车："], ["YES", "有"], ["NO", "无"]
  ];

  const titlePairs = [
    ["Morning ritual","清晨日常"],["Street in motion","街道动态"],["Portrait session","人像拍摄"],["Afternoon companion","午后伙伴"],["Skyward","仰望天空"],["City lights","城市灯光"],["Monochrome day","黑白时光"],["Night study","夜间学习"],
    ["Harbour Morning","港湾清晨"],["Park Corner","公园转角"],["Market Street","市场街道"],["Quiet Plaza","安静广场"],["Museum Avenue","博物馆大道"],["Canal Road","运河路"],["Library Stop","图书馆站"],["Garden Walk","花园步道"],["Hill District","山城区"],["Seaside Lane","海滨小路"],["Station Square","车站广场"],["Riverside Path","河畔小径"],
    ["Red Bus Lane","红色巴士道"],["Green Bus Stop","绿色巴士站"],["Blue Bus Route","蓝色巴士线"],["Orange City Car","橙色城市小汽车"],["Blue Street Car","蓝色街道小汽车"],["Green Avenue Car","绿色大道小汽车"],["Crossing Traffic","路口车辆"],["Downtown Pair","市中心双车"],["Sunset Vehicles","夕阳车辆"],["Bicycle Plaza","自行车广场"],["Fountain Garden","喷泉花园"],["Walking Street","步行街"]
  ];
  entries.push(...titlePairs);

  const enToZh = new Map(entries.map(([en, zh]) => [en, zh]));
  const zhToEn = new Map(entries.map(([en, zh]) => [zh, en]));
  const englishOverrides = new Map([
    ["CURRENT STUDY · 当前正式测试入口", "CURRENT STUDY · OFFICIAL TEST ENTRY"],
    ["结果", "Results"], ["Results / 结果", "Results"], ["总分", "OVERALL SCORE"], ["总分 / OVERALL SCORE", "OVERALL SCORE"],
    ["准确率", "Accuracy"], ["准确率 / Accuracy", "Accuracy"], ["主动用时", "Active time"], ["主动用时 / Active time", "Active time"],
    ["取消次数", "Cancels"], ["取消 / Cancels", "Cancels"], ["撤销次数", "Undo"], ["撤销 / Undo", "Undo"],
    ["导航误触", "Navigation miscues"], ["导航误触 / Nav miscues", "Navigation miscues"], ["正确到达", "Navigation correct"], ["正确到达 / Nav correct", "Navigation correct"],
    ["有巴士", "Bus visible"], ["Bus visible / 有巴士", "Bus visible"], ["不使用", "Not used"], ["Not used / 不使用", "Not used"], ["没有巴士", "No bus"], ["No bus / 无巴士", "No bus"],
    ["只有巴士", "Bus only"], ["Bus only / 只有巴士", "Bus only"], ["只有小汽车", "Car only"], ["Car only / 只有小汽车", "Car only"], ["两者都有", "Bus + car"], ["Bus + car / 两者都有", "Bus + car"], ["两者都没有", "Neither"], ["Neither / 两者都没有", "Neither"],
    ["仅导航", "Navigation only"], ["Navigation only / 仅导航", "Navigation only"], ["正确", "Correct"], ["Correct / 正确", "Correct"],
    ["是否看见巴士？有 → 保留；没有 → 拒绝。", "Is any bus visible? Yes → Keep; No → Reject."],
    ["Is any bus visible? Yes → Keep; No → Reject. / 有巴士→保留；没有→拒绝。", "Is any bus visible? Yes → Keep; No → Reject."],
    ["计算所有可见巴士和普通小汽车，然后按照规则卡分类。", "Count every visible bus and ordinary passenger car, then use the rule card."],
    ["Count every visible bus and ordinary passenger car, then use the rule card. / 以所有可见巴士和小汽车判断。", "Count every visible bus and ordinary passenger car, then use the rule card."]
  ]);
  [
    ["CURRENT STUDY · OFFICIAL TEST ENTRY", "当前研究 · 正式测试入口"], ["Results", "结果"], ["OVERALL SCORE", "总分"],
    ["Accuracy", "准确率"], ["Active time", "主动用时"], ["Cancels", "取消次数"], ["Navigation miscues", "导航误触"], ["Navigation correct", "正确到达"],
    ["Bus visible", "有巴士"], ["Not used", "不使用"], ["No bus", "没有巴士"], ["Bus only", "只有巴士"], ["Car only", "只有小汽车"], ["Bus + car", "两者都有"], ["Neither", "两者都没有"],
    ["Navigation only", "仅导航"], ["Correct", "正确"],
    ["Is any bus visible? Yes → Keep; No → Reject.", "是否看见巴士？有 → 保留；没有 → 拒绝。"],
    ["Count every visible bus and ordinary passenger car, then use the rule card.", "计算所有可见巴士和普通小汽车，然后按照规则卡分类。"]
  ].forEach(([en, zh]) => enToZh.set(en, zh));
  let language;
  try { language = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  if (language !== "zh" && language !== "en") language = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  let applying = false;

  function dynamic(text, target) {
    if (target === "zh") {
      let m;
      if ((m = text.match(/^(\d+) photos$/))) return `${m[1]} 张照片`;
      if ((m = text.match(/^(\d+) trials$/))) return `${m[1]} 个试次`;
      if ((m = text.match(/^(\d+) \/ 24 SORTED$/))) return `${m[1]} / 24 已分类`;
      if ((m = text.match(/^PHOTO #(\d+) · SHOT (\d+)\/3$/))) return `照片 #${m[1]} · 第 ${m[2]}/3 张`;
      if ((m = text.match(/^STUDY · (.+)$/))) return `测试 · ${m[1]}`;
      if ((m = text.match(/^Find Photo #(\d+) · (.+)$/))) return `找到照片 #${m[1]} · ${translateString(m[2], "zh")}`;
      if ((m = text.match(/^Selected: (.+)$/))) return `已选择：${translateString(m[1], "zh")}`;
      if ((m = text.match(/^(.+) · TARGET$/))) return `${m[1]} · 目标`;
      if ((m = text.match(/^(.+) · ORIGINAL CONTROLLED ILLUSTRATION$/))) return `${m[1]} · 原创可控插图`;
      if ((m = text.match(/^(.+) · ORIGINAL CONTROLLED PHOTO$/))) return `${m[1]} · 原创可控照片`;
      if ((m = text.match(/^Practice answer: (.+)$/))) return `练习答案：${translateString(m[1], "zh")}`;
      if ((m = text.match(/^(Keep|Edit|Maybe|Reject) ✓$/))) return `${translateString(m[1], "zh")} ✓`;
      if ((m = text.match(/^↶\s*Undo$/))) return `↶ 撤销`;
      if ((m = text.match(/^Bus: (YES|NO) · Car: (YES|NO)$/))) return `巴士：${m[1] === "YES" ? "有" : "无"} · 小汽车：${m[2] === "YES" ? "有" : "无"}`;
      if ((m = text.match(/^(L[12]-\d+) · (.+)$/))) return `${m[1]} · ${translateString(m[2], "zh")}`;
      if ((m = text.match(/^(.+): (.+)$/))) {
        const left = enToZh.get(m[1]) || m[1], right = enToZh.get(m[2]) || m[2];
        if (left !== m[1] || right !== m[2]) return `${left}: ${right}`;
      }
      if ((m = text.match(/^How to use (.+)$/))) return `${m[1]} 使用方法`;
      if ((m = text.match(/^Open photo (\d+)$/))) return `打开照片 ${m[1]}`;
      if ((m = text.match(/^Current photo (\d+)$/))) return `当前照片 ${m[1]}`;
      if ((m = text.match(/^Photo (\d+)$/))) return `照片 ${m[1]}`;
      if ((m = text.match(/^Photo (L[12]-\d+)$/))) return `图片 ${m[1]}`;
      if ((m = text.match(/^PHOTO (L[12]-\d+)$/))) return `图片编号 ${m[1]}`;
      if ((m = text.match(/^(\d+) of (\d+) photos classified$/))) return `已分类 ${m[1]} / ${m[2]} 张图片`;
      if ((m = text.match(/^Still unfinished: (.+)$/))) return `尚未完成：${m[1]}`;
      if ((m = text.match(/^(Level 1|Level 2|Demo) unfinished: (.+)$/))) return `${translateString(m[1], "zh")}尚未完成：${m[2]}`;
      if ((m = text.match(/^Swipe left or right until (L[12]-\d+) is visible\. Do not classify any photo\.$/))) return `左右滑动，直到显示 ${m[1]}；不要为任何图片分类。`;
      if ((m = text.match(/^Go to (.+) “(.+)”. Do not classify\. \/ 找到指定图片，不要分类。$/))) return `前往 ${m[1]}“${translateString(m[2], "zh")}”，不要分类。`;
      if (text === "Is any bus visible? Yes → Keep; No → Reject. / 有巴士→保留；没有→拒绝。") return "是否看见巴士？有 → 保留；没有 → 拒绝。";
      if (text === "Count every visible bus and ordinary passenger car, then use the rule card. / 以所有可见巴士和小汽车判断。") return "计算所有可见巴士和普通小汽车，然后按照规则卡分类。";
    } else {
      let m;
      if ((m = text.match(/^(\d+) 张照片$/))) return `${m[1]} photos`;
      if ((m = text.match(/^(\d+) 个试次$/))) return `${m[1]} trials`;
      if ((m = text.match(/^(\d+) \/ 24 已分类$/))) return `${m[1]} / 24 SORTED`;
      if ((m = text.match(/^照片 #(\d+) · 第 (\d+)\/3 张$/))) return `PHOTO #${m[1]} · SHOT ${m[2]}/3`;
      if ((m = text.match(/^测试 · (.+)$/))) return `STUDY · ${m[1]}`;
      if ((m = text.match(/^找到照片 #(\d+) · (.+)$/))) return `Find Photo #${m[1]} · ${translateString(m[2], "en")}`;
      if ((m = text.match(/^已选择：(.+)$/))) return `Selected: ${translateString(m[1], "en")}`;
      if ((m = text.match(/^(.+) · 目标$/))) return `${m[1]} · TARGET`;
      if ((m = text.match(/^(.+) · 原创可控插图$/))) return `${m[1]} · ORIGINAL CONTROLLED ILLUSTRATION`;
      if ((m = text.match(/^(.+) · 原创可控照片$/))) return `${m[1]} · ORIGINAL CONTROLLED PHOTO`;
      if ((m = text.match(/^练习答案：(.+)$/))) return `Practice answer: ${translateString(m[1], "en")}`;
      if ((m = text.match(/^(保留|编辑|待定|拒绝) ✓$/))) return `${translateString(m[1], "en")} ✓`;
      if ((m = text.match(/^↶\s*撤销$/))) return `↶ Undo`;
      if ((m = text.match(/^巴士：(有|无) · 小汽车：(有|无)$/))) return `Bus: ${m[1] === "有" ? "YES" : "NO"} · Car: ${m[2] === "有" ? "YES" : "NO"}`;
      if ((m = text.match(/^(L[12]-\d+) · (.+)$/))) return `${m[1]} · ${translateString(m[2], "en")}`;
      if ((m = text.match(/^(.+): (.+)$/))) {
        const left = englishOverrides.get(m[1]) || zhToEn.get(m[1]) || m[1], right = englishOverrides.get(m[2]) || zhToEn.get(m[2]) || m[2];
        if (left !== m[1] || right !== m[2]) return `${left}: ${right}`;
      }
      if ((m = text.match(/^(.+) 使用方法$/))) return `How to use ${m[1]}`;
      if ((m = text.match(/^打开照片 (\d+)$/))) return `Open photo ${m[1]}`;
      if ((m = text.match(/^当前照片 (\d+)$/))) return `Current photo ${m[1]}`;
      if ((m = text.match(/^照片 (\d+)$/))) return `Photo ${m[1]}`;
      if ((m = text.match(/^图片 (L[12]-\d+)$/))) return `Photo ${m[1]}`;
      if ((m = text.match(/^图片编号 (L[12]-\d+)$/))) return `PHOTO ${m[1]}`;
      if ((m = text.match(/^已分类 (\d+) \/ (\d+) 张图片$/))) return `${m[1]} of ${m[2]} photos classified`;
      if ((m = text.match(/^尚未完成：(.+)$/))) return `Still unfinished: ${m[1]}`;
      if ((m = text.match(/^(关卡 1|关卡 2|Demo)尚未完成：(.+)$/))) return `${translateString(m[1], "en")} unfinished: ${m[2]}`;
      if ((m = text.match(/^左右滑动，直到显示 (L[12]-\d+)；不要为任何图片分类。$/))) return `Swipe left or right until ${m[1]} is visible. Do not classify any photo.`;
      if ((m = text.match(/^前往 (.+)“(.+)”，不要分类。$/))) return `Go to ${m[1]} “${translateString(m[2], "en")}”. Do not classify. / 找到指定图片，不要分类。`;
      if (text === "是否看见巴士？有 → 保留；没有 → 拒绝。") return "Is any bus visible? Yes → Keep; No → Reject. / 有巴士→保留；没有→拒绝。";
      if (text === "计算所有可见巴士和普通小汽车，然后按照规则卡分类。") return "Count every visible bus and ordinary passenger car, then use the rule card. / 以所有可见巴士和小汽车判断。";
    }
    return text;
  }

  function translateString(value, target = language) {
    if (value == null) return value;
    const text = String(value);
    if (target === "en" && englishOverrides.has(text)) return englishOverrides.get(text);
    const direct = target === "zh" ? enToZh.get(text) : zhToEn.get(text);
    return direct ?? dynamic(text, target);
  }

  function translateTextNode(node) {
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const translated = translateString(trimmed);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }

  function translateElement(element) {
    if (!(element instanceof Element) || element.closest("[data-language-switch]")) return;
    for (const attr of ["aria-label", "title", "placeholder", "alt"]) {
      if (!element.hasAttribute(attr)) continue;
      const value = element.getAttribute(attr);
      const translated = translateString(value);
      if (translated !== value) element.setAttribute(attr, translated);
    }
    for (const node of element.childNodes) if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
  }

  function apply(root = document.body) {
    if (!root || applying) return;
    applying = true;
    if (root.nodeType === Node.TEXT_NODE) translateTextNode(root);
    else if (root instanceof Element || root === document) {
      if (root instanceof Element) translateElement(root);
      root.querySelectorAll?.("*").forEach(translateElement);
    }
    document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("[data-language-switch] button").forEach((button) => {
      button.classList.toggle("active", button.dataset.lang === language);
      button.setAttribute("aria-pressed", button.dataset.lang === language ? "true" : "false");
    });
    applying = false;
  }

  function setLanguage(next) {
    if (next !== "zh" && next !== "en") return;
    language = next;
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    apply(document);
    window.dispatchEvent(new CustomEvent("flicksort-languagechange", { detail: { language } }));
  }

  function mount() {
    if (document.querySelector("[data-language-switch]")) return;
    const style = document.createElement("style");
    style.textContent = `.language-switch{position:fixed;z-index:10000;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));display:flex;padding:3px;border:1px solid rgba(127,145,139,.45);border-radius:999px;background:rgba(16,23,27,.88);box-shadow:0 5px 20px rgba(0,0,0,.2);backdrop-filter:blur(10px)}.language-switch button{min-width:38px;padding:6px 8px;color:#b5c3bf;border:0;border-radius:999px;background:transparent;font:750 11px/1 system-ui;cursor:pointer}.language-switch button.active{color:#10211c;background:#8be1c5}@media(max-width:520px){.language-switch{top:auto;right:10px;bottom:max(10px,env(safe-area-inset-bottom))}}`;
    document.head.appendChild(style);
    const switcher = document.createElement("div");
    switcher.className = "language-switch";
    switcher.dataset.languageSwitch = "";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Language / 语言");
    switcher.innerHTML = `<button type="button" data-lang="en">EN</button><button type="button" data-lang="zh">中文</button>`;
    switcher.addEventListener("click", (event) => { const button = event.target.closest("button[data-lang]"); if (button) setLanguage(button.dataset.lang); });
    document.body.appendChild(switcher);
    apply(document);
  }

  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateTextNode(mutation.target);
      for (const node of mutation.addedNodes || []) apply(node.nodeType === Node.TEXT_NODE ? node : node);
    }
  });

  window.FlickSortLanguage = { get language() { return language; }, setLanguage, t: translateString, apply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { mount(); observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt"] }); });
  else { mount(); observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt"] }); }
})();
