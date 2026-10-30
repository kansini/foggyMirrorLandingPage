export type Locale = 'zh' | 'en'
export type Theme = 'light' | 'dark'

export interface MirrorLabels {
  name: string
  imageAlt: string
  reset: string
  heart: string
  hint: string
  fallback: string
  handwriting: string
  demo: string
  draw: string
  stopDrawing: string
  clear: string
}

export interface MemoriesContent {
  label: string; title: string[]; description: string
  video: string; videoTitle: string; videoDescription: string; photo: string; photoTitle: string; photoDescription: string
  duration: string; sound: string; save: string; demo: string; actual: string; imageAlt: string
  play: string; pause: string; replay: string; complete: string; progress: string; action: string
}

interface PageContent {
  title: string
  description: string
  brand: string
  home: string
  skip: string
  navigation: string
  menu: string
  close: string
  language: string
  light: string
  dark: string
  nav: string[]
  download: string
  store: string
  hero: { label: string; lineOne: string; lineTwo: string; aside: string; description: string; preview: string; note: string; scroll: string; invitation: string }
  mirror: MirrorLabels
  interlude: { first: string; second: string; third: string }
  story: { label: string; title: string[]; description: string; marginal: string; steps: { title: string; text: string; icon: string }[] }
  weather: { label: string; title: string; subtitle: string; select: string; preview: string; caption: string; note: string; imageAlt: string }
  moods: { id: string; name: string; word: string; icon: string; line: string; description: string; time: string }[]
  moments: MemoriesContent
  privacy: { label: string; title: string; summary: string; more: string; paragraphs: string[]; store: string }
  faq: { label: string; title: string; items: { question: string; answer: string }[] }
  ending: { label: string; title: string[]; description: string; platform: string; note: string }
  footer: string
  contact: string
  contactSection: { title: string; description: string; email: string }
  moreApps: { title: string; newTab: string }
  preview: { label: string; title: string; alt: string; caption: string }
  immersion: { label: string; hint: string; scroll: string; handoff: string[]; handoffNote: string }
  showcase: { label: string; title: string[]; description: string; swipe: string; previous: string; next: string; items: { title: string; description: string; alt: string }[] }
}

export const content: Record<Locale, PageContent> = {
  zh: {
    title: '雾镜 · 呼——雾里见。',
    description: '哈一口气，画一点心情。雾镜把起雾玻璃上的小快乐，装进你的 iPhone。',
    brand: '雾镜', home: '雾镜首页', skip: '跳至主要内容', navigation: '主导航', menu: '展开导航', close: '关闭', language: '选择语言', light: '切换为浅色模式', dark: '切换为深色模式',
    nav: ['体验', '功能', '风格', '联系我们'], download: '下载雾镜', store: '在 App Store 下载',
    hero: { label: '一款没那么正经的镜子 App', lineOne: '呼 —', lineTwo: '雾里见。', aside: '把世界调模糊一点。', description: '没什么大不了。\n只是哈一口气，画一点心情，\n把普通的一天，变得有点可爱。', preview: '先偷看一眼 App', note: '为 iPhone 而生 / 为小快乐而来', scroll: '往下，还有一点浪漫', invitation: '擦一下，有惊喜。' },
    mirror: { name: '铺满首屏的互动雾镜', imageAlt: '玻璃后的清晰橘猫照片，擦去凝露后显露原始画面', reset: '哈一口气，重新起雾', heart: '在雾里画一颗心', hint: '按住鼠标擦雾 · 手机点画笔开始', fallback: '下载 App，体验指尖绘画', handwriting: '今天，随心一点。', demo: '网页雾镜 · 示例照片', draw: '开启触屏绘画', stopDrawing: '结束绘画，恢复滚动', clear: '擦净整面镜子' },
    immersion: { label: '这整个屏幕，都是你的镜子。', hint: '试着擦一下。什么都不画，也很好。', scroll: '往下，把这面雾装进口袋', handoff: ['一整面的雾，', '装进口袋。'], handoffNote: '从此，随时随地都有一点小快乐。' },
    showcase: { label: 'INSIDE THE MIST / 真实 APP 界面', title: ['一口气，', '五种小快乐。'], description: '从遇见一面雾，到收藏一段心情。', swipe: '滑动看一看', previous: '上一张截屏', next: '下一张截屏', items: [
      { title: '先把世界，放轻一点。', description: '打开雾镜，留一点时间给自己。', alt: '雾镜启动界面，凝露玻璃后的蓝色小精灵' },
      { title: '心情，不用打草稿。', description: '在实时镜面上，写写画画。', alt: '雾镜实时相机上画出的爱心、猫耳与手写涂鸦' },
      { title: '小事，也值得认真收藏。', description: '雾迹里，装着日常的一笔一瞬。', alt: '雾迹收藏界面，展示已保存的照片和视频作品' },
      { title: '把此刻，寄给想见的人。', description: '留一张照片，存下来，或分享出去。', alt: '作品照片预览及保存、分享按钮' },
      { title: '今天，想要哪种天气？', description: '晨雾、雨夜、旧镜、月光，随心切换。', alt: '镜面风格设置，展示晨雾、雨夜、旧镜和月光' },
    ] },
    interlude: { first: '哈一口气', second: '写一点喜欢', third: '不必有意义' },
    story: { label: '01 / A SMALL, HAPPY NOTHING', title: ['生活需要一点', '无目的的', '快乐。'], description: '比如，小时候在车窗上画的那颗心。\n雾镜想把那一刻，还给长大后的你。', marginal: '不用画得好。\n开心，就已经很好。', steps: [
      { title: '一口气，起雾。', text: '轻轻张嘴，让镜面覆上水雾。也能一键起雾，随时把世界放轻。', icon: 'wind' },
      { title: '一根手指，随心。', text: '触屏涂画，或在镜头前隔空挥动。擦掉的地方，露出此刻的你。', icon: 'heart' },
      { title: '每一笔，都留下。', text: '拍下作品，或录制最长 15 秒的无声视频，把写字、画画的过程一起收藏。', icon: 'video' },
    ] },
    weather: { label: '02 / YOUR PERSONAL WEATHER', title: '心情，有自己的天气。', subtitle: '选一种雾，给今天的自己。', select: '选择镜面风格', preview: '带着这份心情，去画一笔', caption: '每种心情，都有容身之处。', note: '镜面风格的氛围示意', imageAlt: '蓝色雾镜小精灵藏在凝露玻璃后' },
    moods: [
      { id: 'morning', name: '晨雾', word: 'Morning', icon: 'sun', line: '慢慢醒来，也没关系。', description: '温暖、细腻。像清晨第一缕光，轻轻落在窗上。', time: '08:06' },
      { id: 'rain', name: '雨夜', word: 'Rainfall', icon: 'drop', line: '下一场，只属于你的雨。', description: '冷调雾气与饱满凝露，接住那些不想大声说的心事。', time: '22:17' },
      { id: 'vintage', name: '旧镜', word: 'Yesterday', icon: 'layers', line: '把此刻，过成一张旧照片。', description: '暖色、斑驳、有一点怀念。给今天添一点旧时光。', time: '16:32' },
      { id: 'moon', name: '月光', word: 'Moonlight', icon: 'moon', line: '今晚，月亮替你保密。', description: '安静的银蓝色。留一句话，给夜深还没睡的自己。', time: '00:41' },
    ],
    moments: {
      label: '03 / KEEP THE LITTLE MOMENTS', title: ['留下心情，', '也留下每一笔。'],
      description: '照片留住画好的那一刻。\n视频，把写写画画的过程也留下。',
      video: '视频', videoTitle: '从第一笔，到画完的那一秒。', videoDescription: '开始录制，让爱心一点点成形，让一句话慢慢写完。镜面上的小动作，也值得被记住。',
      photo: '照片', photoTitle: '这一刻，就这样收好。', photoDescription: '凝露、笔迹，还有雾后的风景。拍成照片，收藏此刻的心情。',
      duration: '最长 15 秒', sound: '无声视频', save: '存入雾迹、相册，或分享出去', demo: '绘画过程演示 · 网页模拟', actual: 'App 作品 · 截取自照片预览',
      imageAlt: '雾镜 App 真实作品：夕阳与凝露玻璃上擦出的爱心、文字和笑脸',
      play: '播放绘画过程', pause: '暂停演示', replay: '从第一笔重看', complete: '每一笔，都留下了。', progress: '绘画演示进度', action: '去 App 录下你的下一笔',
    },
    privacy: { label: 'JUST BETWEEN YOU & YOU', title: '你的心事，不必经过云端。', summary: '镜头与动作识别在本机处理。保存、分享，都由你决定。', more: '关于隐私', paragraphs: ['雾镜的镜头画面、嘴部动作识别和手部追踪都在你的设备本地处理，不上传画面或分析数据。哈气交互不使用麦克风。', '照片和视频由你主动拍摄，可保存到本机「雾迹」、系统相册，或通过系统分享。「雾迹」中的作品会随 App 删除而移除，重要作品请另存相册。', '本网页仅使用示例图片，不请求相机或麦克风权限，不上传网页笔迹。语言和主题偏好仅存储在当前浏览器中。'], store: '查看 App Store 完整隐私信息' },
    faq: { label: 'BEFORE YOU WANDER IN', title: '顺便问一下。', items: [
      { question: '所以，雾镜到底是什么？', answer: '一个让手机变成起雾镜面的互动 App。你可以在实时镜头或照片上起雾、写字和画画，拍下照片或录一小段雾迹。它想做的事很简单：让日常多一点好玩。' },
      { question: '真的要对着手机哈气吗？', answer: '不用真的吹出气流。开启哈气后，让嘴部进入前置镜头，轻轻张嘴就能模拟起雾，也可以直接点击「起雾」。App 识别嘴部动作，不使用麦克风。后置镜头下的嘴部识别需要设备支持前后双摄同时工作。' },
      { question: '我可以用自己的照片吗？', answer: '当然。在 App 中点击「背景」，选择你喜欢的人、宠物或风景，就能在照片上起雾和涂画。也能随时切回实时镜头。' },
      { question: '这些小心情，能保存下来吗？', answer: '可以保存照片，或录制最长 15 秒的无声视频。作品可存入系统相册、收入本机「雾迹」，或通过系统分享。雾迹保存合成作品，不能重新编辑笔迹；重要作品建议另存相册。' },
    ] },
    ending: { label: 'YOUR TURN TO MAKE A LITTLE MESS', title: ['下一笔，', '轮到你。'], description: '世界已经够清晰了。\n来，给生活一点朦胧的余地。', platform: '适用于 iPhone · 设备要求以 App Store 为准', note: '随手一画，也算浪漫。' },
    footer: '留一点雾，给生活留一点余地。',
    contact: '联系我们',
    contactSection: { title: '有话，写给我们。', description: '使用反馈、功能建议，或一句简单的问候，都欢迎写信给我们。', email: '电子邮件' },
    moreApps: { title: '更多 App', newTab: '在新标签页打开' },
    preview: { label: 'A PEEK INSIDE', title: '拿在手里的小浪漫。', alt: '雾镜真实界面：起雾的实时镜面、绘画工具、照片背景与雾迹拍摄', caption: 'App 实际界面 · 效果随镜头与风格变化' },
  },
  en: {
    title: 'Foggy Mirror · A little mist. A little magic.',
    description: 'Breathe a little. Draw a feeling. Foggy Mirror brings the simple joy of drawing on misty glass to your iPhone.',
    brand: 'Foggy Mirror', home: 'Foggy Mirror home', skip: 'Skip to content', navigation: 'Main navigation', menu: 'Open navigation', close: 'Close', language: 'Choose language', light: 'Switch to light mode', dark: 'Switch to dark mode',
    nav: ['Try it', 'Features', 'Styles', 'Contact'], download: 'Get the app', store: 'Download on the App Store',
    hero: { label: 'A mirror with a playful side', lineOne: 'A little mist.', lineTwo: 'A little magic.', aside: 'Let the world go a little blurry.', description: 'No big plans.\nJust a breath, a doodle,\nand an ordinary day made a little sweeter.', preview: 'Take a peek inside', note: 'Made for iPhone / Made for little joys', scroll: 'A little more wonder below', invitation: 'Wipe here. Find a surprise.' },
    mirror: { name: 'Full-screen interactive mist mirror', imageAlt: 'A sharp photo of an orange cat behind glass. Wipe the condensation to reveal the original scene.', reset: 'Breathe and mist over again', heart: 'Draw a heart in the mist', hint: 'Drag to wipe · On mobile, tap the pen first', fallback: 'Get the app to draw on mist', handwriting: 'A little more you.', demo: 'Web mirror · Sample photo', draw: 'Enable touch drawing', stopDrawing: 'Finish drawing and resume scrolling', clear: 'Wipe the whole mirror clean' },
    immersion: { label: 'This whole screen is your mirror.', hint: 'Wipe a little. Or do nothing at all.', scroll: 'Scroll to put this feeling in your pocket', handoff: ['A world of mist.', 'In your pocket.'], handoffNote: 'A little joy, wherever you happen to be.' },
    showcase: { label: 'INSIDE THE MIST / ACTUAL APP SCREENS', title: ['One little breath.', 'Five little joys.'], description: 'From a misty hello to a memory you can keep.', swipe: 'Swipe to wander through', previous: 'Previous screenshot', next: 'Next screenshot', items: [
      { title: 'Let the world soften.', description: 'Open your mirror. Take a moment for yourself.', alt: 'Foggy Mirror launch screen with its little blue character behind dewy glass' },
      { title: 'No first drafts needed.', description: 'Draw whatever comes to mind on your live reflection.', alt: 'Live mirror with a hand-drawn heart, cat ears and playful doodles' },
      { title: 'The little things count.', description: 'An archive for the small moments you want to keep.', alt: 'The local archive displaying saved photos and videos' },
      { title: 'Send someone a little now.', description: 'Capture a photo. Save it, or share the feeling.', alt: 'Photo preview with controls to save and share a finished work' },
      { title: 'Choose your inner weather.', description: 'Morning, Rainfall, Vintage or Moonlight. Your call.', alt: 'Mirror style settings showing Morning, Rainfall, Vintage and Moonlight' },
    ] },
    interlude: { first: 'Breathe a little', second: 'Draw a feeling', third: 'Just because' },
    story: { label: '01 / A SMALL, HAPPY NOTHING', title: ['A little joy.', 'No reason', 'required.'], description: 'Remember that heart you drew on a foggy car window?\nThis is a little way back to that feeling.', marginal: 'It doesn’t have to be good.\nIt just has to feel good.', steps: [
      { title: 'One breath. Hello, mist.', text: 'A gentle mouth movement brings the mist to life. Or tap once to let the world soften.', icon: 'wind' },
      { title: 'One finger. Anything goes.', text: 'Draw on the screen or move a finger in front of the camera. Every stroke reveals a little of you.', icon: 'heart' },
      { title: 'Keep every little stroke.', text: 'Take a photo, or record up to 15 seconds of silent video to keep the drawing and writing as it happens.', icon: 'video' },
    ] },
    weather: { label: '02 / YOUR PERSONAL WEATHER', title: 'An atmosphere of your own.', subtitle: 'Pick a little weather for your inner world.', select: 'Choose a mirror style', preview: 'Take this feeling for a doodle', caption: 'There’s room for every kind of feeling.', note: 'An illustration of each mirror’s atmosphere', imageAlt: 'The little blue Foggy Mirror character behind dewy glass' },
    moods: [
      { id: 'morning', name: 'Morning', word: 'Morning', icon: 'sun', line: 'Take your time waking up.', description: 'Warm and delicate. Like the first light finding its way across your window.', time: '08:06' },
      { id: 'rain', name: 'Rainfall', word: 'Rainfall', icon: 'drop', line: 'A little rain, just for you.', description: 'Cool tones and fuller droplets. A place for the things you don’t feel like saying aloud.', time: '22:17' },
      { id: 'vintage', name: 'Vintage', word: 'Yesterday', icon: 'layers', line: 'Today, with a hint of yesterday.', description: 'Warmth, gentle patina, a little nostalgia. A moment that already feels like a memory.', time: '16:32' },
      { id: 'moon', name: 'Moonlight', word: 'Moonlight', icon: 'moon', line: 'The moon can keep a secret.', description: 'Quiet, silvery blue. Leave a note for the part of you that’s still awake.', time: '00:41' },
    ],
    moments: {
      label: '03 / KEEP THE LITTLE MOMENTS', title: ['Keep the feeling.', 'And every stroke.'],
      description: 'A photo holds the finished moment.\nA video keeps the way you made it.',
      video: 'Video', videoTitle: 'From the first stroke to the last.', videoDescription: 'Record a heart taking shape or a note appearing, letter by letter. The little gestures deserve a place in your memories, too.',
      photo: 'Photo', photoTitle: 'A little now, yours to keep.', photoDescription: 'Droplets, drawings, and the view behind the glass. Take a photo of the feeling.',
      duration: 'Up to 15 seconds', sound: 'Silent video', save: 'Save to your archive, photo library, or share', demo: 'Drawing process · Web simulation', actual: 'App artwork · From the photo preview',
      imageAlt: 'Actual Foggy Mirror artwork: a heart, handwritten note and smile wiped into dewy glass over a sunset',
      play: 'Play the drawing process', pause: 'Pause the demo', replay: 'Watch from the first stroke', complete: 'Every stroke, remembered.', progress: 'Drawing demo progress', action: 'Record your next little moment in the app',
    },
    privacy: { label: 'JUST BETWEEN YOU & YOU', title: 'Your feelings don’t need a cloud.', summary: 'Camera and motion analysis stay on your device. You decide what to save or share.', more: 'A note on privacy', paragraphs: ['Camera frames, mouth movement recognition and hand tracking are processed locally on your device. Frames and analysis data are not uploaded. The mist interaction does not use your microphone.', 'You choose when to capture, save or share photos and videos. Works saved in the local archive are removed when the app is deleted. Save important memories to your photo library.', 'This website uses sample images only. It does not request camera or microphone access or upload your drawings. Language and theme preferences are saved only in your current browser.'], store: 'See full privacy information on the App Store' },
    faq: { label: 'BEFORE YOU WANDER IN', title: 'Glad you asked.', items: [
      { question: 'So, what exactly is Foggy Mirror?', answer: 'An interactive app that turns your iPhone into a misty mirror. Add mist to a live camera view or a photo, draw a little, then capture a photo or a short video. Its job is simple: make an ordinary day a little more fun.' },
      { question: 'Do I actually breathe onto my phone?', answer: 'No actual airflow is needed. With mist detection enabled, bring your mouth into the front camera view and gently open it, or simply tap the mist button. The app recognises mouth movements and does not use your microphone. Mouth recognition with the rear camera requires a device that supports simultaneous front and rear cameras.' },
      { question: 'Can I use my own photos?', answer: 'Of course. Choose Background in the app and pick a person, pet or view you love. Add mist and draw right on the photo. You can switch back to the live camera whenever you like.' },
      { question: 'Can I keep what I make?', answer: 'Save a photo or record a silent video up to 15 seconds long. Save to your photo library or local archive, or use the system share sheet. The archive stores finished images and videos, not editable strokes. Save important works to your photo library.' },
    ] },
    ending: { label: 'YOUR TURN TO MAKE A LITTLE MESS', title: ['Your turn.', 'Make a little mist.'], description: 'The world is sharp enough.\nLeave a little room for wonder.', platform: 'For iPhone · See App Store for device requirements', note: 'A little doodle counts as romance.' },
    footer: 'A little mist. A little room to just be.',
    contact: 'Contact us',
    contactSection: { title: 'A little note goes a long way.', description: 'Feedback, a feature idea, or just a hello. We’d love to hear from you.', email: 'Email' },
    moreApps: { title: 'More apps', newTab: 'Opens in a new tab' },
    preview: { label: 'A PEEK INSIDE', title: 'A little wonder, in your hand.', alt: 'The real Foggy Mirror app: live misty mirror, drawing tools, photo backgrounds and capture controls', caption: 'Actual app interface · Appearance varies with camera and style' },
  },
}
