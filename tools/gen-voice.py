import asyncio, os
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
OUT = os.path.join(os.path.dirname(__file__), "..", "audio")

LINES = {
    "welcome": "欢迎来到小小维修站！",
    "intro-race": "你好呀！我马上要去比赛，可是我的轮胎坏啦！",
    "intro-dump": "你好呀！我要去工地运石头，可是我的轮胎不见啦！",
    "task-tires-prefix": "帮我装上",
    "task-tires-suffix": "个轮胎吧！",
    "praise-1": "哇！太棒啦！",
    "praise-2": "谢谢你，小师傅！",
    "goodbye-1": "我出发啦！下次见！",
    "closing-1": "今天辛苦啦！车库要打烊咯！",
    "closing-2": "晚安，明天见！",
    "sleeping-1": "嘘，大家都在睡觉呢。明天再来吧！",
    "demo-hint": "看我做一遍哦！",
    "idle-tires": "把轮胎拖到圈圈里试试看！",
    "task-fuel-prefix": "帮我加油，加到数字",
    "task-fuel-suffix": "就停下来哦！",
    "fuel-over": "哎呀，加多了一点点，我们再来一次！",
    "fuel-more": "还没到呢，继续按住加油！",
    "idle-fuel": "按住红色的加油按钮，看数字慢慢变大哦！",
    "task-lights": "帮我换上和我车身一样颜色的车灯吧！",
    "lights-wrong": "嗯，这个颜色好像不太一样哦，再看看！",
    "idle-lights": "点一点和车身颜色一样的灯泡！",
    "task-wash": "帮我洗个澡吧，擦得亮晶晶！",
    "idle-wash": "用手指把泥点点擦掉试试看！",
    "task-math": "帮我算一道题吧！",
    "math-jia": "加",
    "math-jian": "减",
    "math-dengyu": "等于",
    "math-dengyu-ji": "等于几呀？",
    "math-yiqi": "我们一起数！",
    "math-wrong": "还差一点点，我们一起数一数吧！",
    "math-duila": "对啦！",
    "math-zailai": "再装上",
    "math-nazou": "拿走",
    "idle-math": "点一点下面正确的数字！",
    "task-hanzi-prefix": "帮我找到",
    "task-hanzi-suffix": "字的箱子！",
    "hanzi-wrong": "再看看，这个不是哦！",
    "idle-hanzi": "找一找刚才说的那个字！",
    "task-trace-prefix": "跟我一起写",
    "task-trace-suffix": "字！",
    "trace-hint": "跟着灰色的笔画慢慢写哦！",
    "trace-good": "写得真棒！",
    "idle-trace": "用手指沿着字描一描！",
    "intro-police": "你好呀！我马上要去巡逻，可是我的轮胎不见啦！",
    "intro-ambulance": "你好呀！我要赶去救小病人，快帮帮我！",
    "intro-fire": "你好呀！我要去灭火，可是车子坏啦！",
    "intro-digger": "你好呀！我要去挖大大的坑，帮我修一修吧！",
    "intro-mixer": "你好呀！我要去盖新房子，可是我动不了啦！",
    "intro-loader": "你好呀！我要去铲沙子，帮帮我吧！",
    "hub-next": "下一位客人马上到！",
    "hub-mycar": "去我的车库！",
    "hub-album": "打开朋友相册！",
    "buddy-hello-1": "嗨，小师傅，今天也一起加油哦！",
    "buddy-hello-2": "你来啦！我们开工吧！",
    "garage-mine": "欢迎来到我的车库，随便打扮我吧！",
    "paint-fun": "唰唰唰，这个颜色真好看！",
    "wheel-cool": "哇，新轮子太酷啦！",
    "sticker-stick": "贴好啦！",
    "sticker-get-1": "叮！送你一张新贴纸！",
    "sticker-get-2": "这是给你的小礼物！",
    "paint-get": "哇，解锁了新的喷漆颜色！",
    "wheel-get": "哇，解锁了新轮毂！",
    "album-open": "这些都是你帮助过的朋友！",
    "badge-get": "太厉害啦！你获得了一枚新徽章！",
    "friend-back-1": "是你呀小师傅！上次谢谢你！",
    "friend-back-2": "我又来啦！还是想找你修！",
    "vip-ask": "我是金头盔冠军车！敢不敢接受我的挑战任务？",
    "vip-accept-cheer": "太勇敢啦！挑战开始！",
    "vip-decline-ok": "没关系，下次再挑战！",
    "vip-done": "挑战成功！你真是超级小师傅！",
    "vip-drop": "这是冠军贴纸，送给你！",
    "task-shapes": "帮我把零件装进一样形状的孔里吧！",
    "idle-shapes": "把零件拖到一样形状的洞洞里！",
    "shapes-wrong": "咦，形状不一样哦，再看看！",
    "task-compare-big": "帮我换上最大的那个！",
    "task-compare-small": "帮我选最小的那个！",
    "task-compare-long": "帮我接上最长的管子！",
    "task-compare-short": "帮我拿最短的管子！",
    "idle-compare": "仔细比一比，再点哦！",
    "compare-wrong": "再比一比，哪个才是呢？",
}
NUM_WORDS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
             "十一", "十二", "十三", "十四", "十五",
             "十六", "十七", "十八", "十九", "二十"]
for i, zh in enumerate(NUM_WORDS, start=1):
    LINES[f"num-{i}"] = zh

CHAR_WORDS = "一二三人大小上下口中山水火土木日月手车门天地你我他白云雨风花草虫鸟牛羊马鱼米田电"
for i, ch in enumerate(CHAR_WORDS, start=1):
    LINES[f"char-{i}"] = ch

async def main():
    os.makedirs(OUT, exist_ok=True)
    for name, text in LINES.items():
        path = os.path.join(OUT, f"{name}.mp3")
        for attempt in range(1, 5):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
                break
            except Exception as e:
                if attempt == 4:
                    raise
                print(f"retry {name} (attempt {attempt}): {e}")
                await asyncio.sleep(1.5 * attempt)
        print("ok", name)
        await asyncio.sleep(0.3)  # 避免连续请求触发edge-tts服务端限流

asyncio.run(main())
