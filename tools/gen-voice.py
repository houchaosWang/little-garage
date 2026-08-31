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
}
for i, zh in enumerate("一二三四五六七八九十", start=1):
    LINES[f"num-{i}"] = zh

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
