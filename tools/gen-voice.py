# 全量生成：python tools/gen-voice.py
# 只生成指定几条：python tools/gen-voice.py 名字1 名字2
#   （全量重生成会让所有mp3的字节都变——edge-tts输出不稳定——git会显示一大片无意义改动）
import asyncio, os, sys
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
    "tires-done-hint": "装够了，就按绿色的勾勾哦！",
    "idle-tires-count": "把轮胎拖进下面的框里，一个一个数，装够了就按绿色的勾勾！",
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
    # 算数重设计：从"一个一个数"引到"接着往后数""凑十"；提示分三档，不急着给答案
    "math-think": "慢慢想，不着急！可以点一点石头，自己数一数哦。",
    "math-again": "再想一想哦！",
    "math-bucket-pre": "桶里有",
    "math-xianyou": "这里有",
    "math-ge-jiezhe": "个，接着往后数！",
    "math-yigong": "一共是",
    "math-bigfirst": "从大的数开始数，更快哦！",
    "math-open": "打开桶看一看！",
    "math-haisheng": "还剩",
    "math-couten": "先凑成十！",
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
    # 闪灯看数（速视）
    "task-sub-count": "看仔细！仪表盘上会亮几盏灯？",
    "task-sub-sum": "看仔细！两边一共亮几盏灯？",
    "task-sub-ten": "看仔细！还差几盏灯，就亮满十盏？",
    "sub-eye": "点一点眼睛，灯就会亮一下哦！",
    "sub-idle": "想一想刚才看到的样子！",
    "sub-again": "我们再看一次！",
    "sub-he": "和",
    "sub-shi": "是",
    "sub-couten": "凑成十！",
    # 找规律
    "task-pat-next": "看看彩灯是怎么排的，下一个该放什么？",
    "task-pat-mid": "中间空了一个，该放什么？",
    "task-pat-same": "下面哪一排，和上面的规律一样？",
    "task-pat-unit": "这串彩灯，是哪一小段在重复？",
    "pat-wrong": "咦，这样就不按规律了，我们从头念一念！",
    "pat-idle": "从头念一念，就知道下一个了！",
    "pat-good": "对啦！一段一段在重复！",
    "col-red": "红",
    "col-blue": "蓝",
    "col-yellow": "黄",
    "col-green": "绿",
    "shp-circle": "圆形",
    "shp-square": "方块",
    "shp-triangle": "三角",
    "shp-star": "星星",
    # 数字赛道
    "task-nl-race": "我们来赛车！转一转转盘，再点一点你的赛车，一格一格往前走！",
    "task-nl-predict": "我们来赛车！转完转盘，先猜一猜会停在哪一格！",
    "task-nl-est": "跑道上的数字被擦掉啦，只看得见两头！",
    "task-nl-left": "看看赛车在哪一格，还差几格就到终点？",
    "nl-where-pre": "赛车要停在",
    "nl-where-post": "，点一点应该在哪里！",
    "nl-spin": "点一点转盘！",
    "nl-tapcar": "点一点你的赛车，往前走！",
    "nl-guess": "猜一猜，会停在哪一格？",
    "nl-right": "猜对啦！",
    "nl-walk": "我们一格一格走一走，看停在哪儿！",
    "nl-myturn": "该我走啦！",
    "nl-win": "你先到终点啦！",
    "nl-zhongjian": "在正中间",
    "nl-close": "很接近啦！",
    "nl-idle-est": "想一想，它离哪一头更近？",
    "nl-idle-left": "从赛车这里，一格一格数到终点！",
    # 停车场故事题（CGI）：句子由片段和数字拼成
    "task-story": "听故事，想一想！",
    "st-have-pre": "停车场里有",
    "st-cars": "辆车",
    "st-liang": "辆",
    "st-comein": "，又开来了",
    "st-q-total": "，现在一共有几辆？",
    "st-leave": "，开走了",
    "st-q-left": "，还剩几辆？",
    "st-total-pre": "一共有",
    "st-outside": "，外面停着",
    "st-q-hidden": "，车库里还藏着几辆？",
    "st-some": "，又开来了一些，",
    "st-now": "现在有",
    "st-q-came": "，开来了几辆？",
    "st-red": "红车有",
    "st-blue": "，蓝车有",
    "st-q-more": "，红车比蓝车多几辆？",
    "st-bluemore": "，蓝车比红车多",
    "st-blueless": "，蓝车比红车少",
    "st-q-blue": "，蓝车有几辆？",
    "st-idle": "想一想，故事里发生了什么？",
    "st-again": "我们再听一遍故事！",
    "st-pair": "一辆对一辆，排好了比一比！",
    "st-open": "打开车库看一看！",
    # 零件分拣（分类 + 规则切换）
    "task-sort-color": "零件混在一起啦！按颜色分：一样颜色的放一个筐！",
    "task-sort-shape": "零件混在一起啦！按形状分：一样形状的放一个筐！",
    "task-sort-switch": "零件混在一起啦！先按颜色分！",
    "sort-switch": "现在换个玩法！按形状分！",
    "task-sort-border": "看边框：有金边的按形状分，没有金边的按颜色分！",
    "sort-by-shape": "这个，按形状！",
    "sort-by-color": "这个，按颜色！",
    "task-sort-guess": "看看筐里是怎么分的，你接着分！",
    "task-sort-both": "颜色和形状都一样的，才放进一个筐！",
    "sort-wrong-color": "要按颜色分哦！",
    "sort-wrong-shape": "要按形状分哦！",
    "sort-wrong-guess": "看看筐里的零件，是按什么分的？",
    "sort-wrong-both": "颜色和形状，都要一样哦！",
    "sort-idle": "把零件拖到对的筐里！",
    "sort-good": "分得真好！",
    # 方位：句子由片段拼成——"把 小扳手 放到 车的 上面"
    "task-sp": "帮我把工具放到对的地方！听好哦！",
    "task-sp-map": "照着小图，把东西摆好！",
    "sp-ba": "把",
    "sp-fangdao": "放到",
    "sp-first": "先",
    "sp-then": "，再",
    "obj-wrench": "小扳手",
    "obj-tire": "小轮胎",
    "obj-can": "小油桶",
    "obj-flag": "小旗子",
    "ref-car": "车的",
    "ref-box": "工具箱的",
    "pos-up": "上面",
    "pos-down": "下面",
    "pos-in": "里面",
    "pos-out": "外面",
    "pos-side": "旁边",
    "pos-front": "前面",
    "pos-back": "后面",
    "pos-left": "左边",
    "pos-right": "右边",
    "sp-wrong": "咦，放的地方不太对，再听一遍！",
    "sp-good": "放对啦！",
    "sp-idle": "听一听，要放到哪里？",
    "sp-front-hint": "车头这边，是前面！",
    "sp-left-hint": "这边，是左边！",
    "sp-right-hint": "这边，是右边！",
}
NUM_WORDS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
             "十一", "十二", "十三", "十四", "十五",
             "十六", "十七", "十八", "十九", "二十"]
for i, zh in enumerate(NUM_WORDS, start=1):
    LINES[f"num-{i}"] = zh

CHAR_WORDS = "一二三人大小上下口中山水火土木日月手车门天地你我他白云雨风花草虫鸟牛羊马鱼米田电"
for i, ch in enumerate(CHAR_WORDS, start=1):
    LINES[f"char-{i}"] = ch

# 车名拍拍：单音节（指着念、拍读、删除后剩下的部分逐个念）。键=拼音声调，与 js/taskgen.js 的 SYL_WORDS 一致。
# 多音字/单念易读错的字，用同音、没有歧义的字生成：斗→抖、垃→拉、圾→机、淇→棋、淋→林（画面上仍显示原字）
SYLLABLES = {
    "jing3": "警", "che1": "车", "sai4": "赛", "chan3": "铲", "huo3": "火", "diao4": "吊", "qi4": "汽",
    "jiu4": "救", "hu4": "护", "xiao1": "消", "fang2": "防", "fan1": "翻", "dou3": "抖", "wa1": "挖",
    "jue2": "掘", "ji1": "机", "jiao3": "搅", "ban4": "拌", "sa3": "洒", "shui3": "水", "la1": "拉",
    "gong1": "公", "jiao1": "交", "chu1": "出", "zu1": "租", "mo2": "摩", "tuo1": "托", "gong4": "共",
    "dian4": "电", "dong4": "动", "bing1": "冰", "qi2": "棋", "lin2": "林", "shuang1": "双", "ceng2": "层",
    "ba1": "巴", "shi4": "士", "deng1": "灯", "lun2": "轮", "men2": "门", "chuang1": "窗", "ding3": "顶", "pai2": "牌",
}
for key, ch in SYLLABLES.items():
    LINES[f"syl-{key}"] = ch
# 整词（自然语调，出题时念）
VEHICLE_WORDS = {
    "jingche": "警车", "saiche": "赛车", "chanche": "铲车", "huoche": "火车", "diaoche": "吊车", "qiche": "汽车",
    "jiuhuche": "救护车", "xiaofangche": "消防车", "fandouche": "翻斗车", "wajueji": "挖掘机", "jiaobanche": "搅拌车",
    "sashuiche": "洒水车", "lajiche": "垃圾车", "gongjiaoche": "公交车", "chuzuche": "出租车", "motuoche": "摩托车",
    "gonggongqiche": "公共汽车", "diandongqiche": "电动汽车", "bingqilinche": "冰淇淋车", "shuangcengbashi": "双层巴士",
    "chedeng": "车灯", "chelun": "车轮", "chemen": "车门", "chechuang": "车窗", "cheding": "车顶", "chepai": "车牌",
}
for key, w in VEHICLE_WORDS.items():
    LINES[f"vn-{key}"] = w
LINES.update({
    "task-syl-clap": "跟我拍车名！说一个字，拍一下鼓！",
    "task-syl-sign": "听车名，找牌子！",
    "task-syl-point": "我指着念，你听好哦！",
    "task-syl-del": "不说一个字，还剩什么？",
    "task-syl-head": "是车的，开进停车位；车上的东西，放进零件箱！",
    "sy-this": "这辆车叫",
    "sy-clap-go": "说一个字，拍一下鼓！",
    "sy-xia": "下！",
    "sy-together": "看我拍：",
    "sy-yourturn": "该你啦！",
    "sy-rule": "一个字，念一个音！",
    "sy-count": "数一数，它有几个音？",
    "sy-find": "哪块牌子写着",
    "sy-which": "哪个字念",
    "sy-bushuo": "不说",
    "sy-shengsha": "还剩什么？",
    "sy-shengxia": "剩下的是",
    "sy-listen": "听一听，是哪一个？",
    "sy-idle-clap": "跟着说车名，说一个字，就拍一下鼓！",
    "sy-point-again": "我们再指着念一遍！",
    "sy-see": "写出来看看！",
    "sy-head-car": "车字在后面，它就是车！",
    "sy-head-part": "车字在前面，是车上的东西！",
    "sy-head-rule": "车字在后面，说的是车；车字在前面，说的是车上的东西。",
    "sy-good": "对啦！",
    "sy-clap-good": "拍对啦！",
    "sy-wrong": "咦，再想一想！",
    "sy-done": "你真会听字音！",
})

async def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    unknown = only - set(LINES)
    if unknown:
        raise SystemExit(f"没有这些语音名：{sorted(unknown)}")
    for name, text in LINES.items():
        if only and name not in only:
            continue
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
