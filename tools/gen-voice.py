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
}
NUM_WORDS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
             "十一", "十二", "十三", "十四", "十五"]
for i, zh in enumerate(NUM_WORDS, start=1):
    LINES[f"num-{i}"] = zh

CHAR_WORDS = "一二三人大小上下口中山水火土木日月手车门"
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
