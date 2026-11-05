<template>
  <div class="comicStudio" :class="{ nightStudio: studioTheme === 'night', largeStudio: studioDensity === 'large', sidebarCollapsed }" :style="studioColors">
    <aside class="studioSidebar" aria-label="主导航">
      <div class="sidebarTop"><a class="studioBrand" href="#/comicStudio">
        <span class="brandMark"><img src="/xiaolengMark.svg" alt="小冷漫画雪花气泡标志" /></span>
        <span v-if="!sidebarCollapsed">
          小冷漫画
          <span class="brandSub">生活有梗，落笔成画</span>
        </span>
      </a>
      <button class="sidebarCollapse" :aria-expanded="!sidebarCollapsed" :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="sidebarCollapsed = !sidebarCollapsed"><icon-layout-sidebar-left-collapse v-if="!sidebarCollapsed" :size="19" /><icon-layout-sidebar-left-expand v-else :size="19" /></button></div>
      <div v-if="!sidebarCollapsed" class="projectSwitch">
        <div class="spaceHeading"><label for="projectSelect">创作空间</label><button class="spaceManage" :disabled="!!busy || saving" aria-label="管理创作空间" title="改名、删除与恢复空间" @click="spaceName = project?.title || ''; spaceManageVisible = true">⋯</button></div>
        <select id="projectSelect" :value="directory" :disabled="!!busy || saving" @change="switchProject">
          <option value="">选择创作空间</option>
          <option v-for="item in comicProjects" :key="item.directory" :value="item.directory">{{ item.name }}</option>
        </select>
        <button class="newProject" :disabled="!!busy || saving" @click="newProjectVisible = true">
          <icon-plus :size="16" />
          新建空间
        </button>
      </div>
      <nav class="sidebarTree" aria-label="功能导航">
        <section class="navGroup">
          <button class="navGroupHeading" :class="{ currentGroup: workspaceMode === 'studio' }" :aria-expanded="expandedSections.has('studio') && !sidebarCollapsed" aria-controls="studioNavigation" aria-label="漫画制作" title="漫画制作" @click="toggleSection('studio')">
            <icon-stack-2 :size="18" aria-hidden="true" /><span v-if="!sidebarCollapsed">漫画制作</span>
            <icon-chevron-right v-if="!sidebarCollapsed" class="groupChevron" :size="15" :class="{ rotated: expandedSections.has('studio') }" aria-hidden="true" />
          </button>
          <div v-if="expandedSections.has('studio') && !sidebarCollapsed" id="studioNavigation" class="stageNav">
            <button v-for="(item, index) in stages" v-show="index !== 5" :key="item.title" :class="{ active: workspaceMode === 'studio' && (stage === index || stage === 5 && index === 4) }" :aria-current="workspaceMode === 'studio' && (stage === index || stage === 5 && index === 4) ? 'page' : undefined" :aria-label="`${String(index > 5 ? index : index + 1).padStart(2, '0')} ${item.title}${stageComplete(index) ? '，已完成' : ''}`" :disabled="!project || !!busy" @click="workspaceMode = 'studio'; stage = index">
              <component :is="item.icon" :size="18" stroke="1.7" class="navIcon" aria-hidden="true" />
              <span class="navText">{{ item.title }}</span>
              <span class="stageNumber" aria-hidden="true">{{ String(index > 5 ? index : index + 1).padStart(2, '0') }}</span>
              <icon-check v-if="stageComplete(index)" class="stageDone" :size="14" aria-hidden="true" />
            </button>
          </div>
        </section>
        <section class="navGroup">
          <button class="navGroupHeading" :class="{ currentGroup: workspaceMode === 'analysis' }" :aria-expanded="expandedSections.has('analysis') && !sidebarCollapsed" aria-controls="analysisNavigation" aria-label="数据分析" title="数据分析" @click="toggleSection('analysis')">
            <icon-layout-dashboard :size="18" aria-hidden="true" /><span v-if="!sidebarCollapsed">数据分析</span>
            <icon-chevron-right v-if="!sidebarCollapsed" class="groupChevron" :size="15" :class="{ rotated: expandedSections.has('analysis') }" aria-hidden="true" />
          </button>
          <div v-if="expandedSections.has('analysis') && !sidebarCollapsed" id="analysisNavigation" class="contextNav">
            <button :class="{ selected: workspaceMode === 'analysis' && analysisView === 'market' }" :aria-current="workspaceMode === 'analysis' && analysisView === 'market' ? 'page' : undefined" @click="navigateSection('analysis', 'market')"><icon-trending-up :size="18" stroke="1.7" aria-hidden="true" /><span>市场热点</span></button>
            <button :class="{ selected: workspaceMode === 'analysis' && analysisView === 'works' }" :aria-current="workspaceMode === 'analysis' && analysisView === 'works' ? 'page' : undefined" @click="navigateSection('analysis', 'works')"><icon-chart-bar :size="18" stroke="1.7" aria-hidden="true" /><span>作品表现</span></button>
          </div>
        </section>
        <section class="navGroup">
          <button class="navGroupHeading" :class="{ currentGroup: workspaceMode === 'archive' }" :aria-expanded="expandedSections.has('archive') && !sidebarCollapsed" aria-controls="archiveNavigation" aria-label="创作档案" title="创作档案" @click="toggleSection('archive')">
            <icon-file-description :size="18" aria-hidden="true" /><span v-if="!sidebarCollapsed">创作档案</span>
            <icon-chevron-right v-if="!sidebarCollapsed" class="groupChevron" :size="15" :class="{ rotated: expandedSections.has('archive') }" aria-hidden="true" />
          </button>
          <div v-if="expandedSections.has('archive') && !sidebarCollapsed" id="archiveNavigation" class="contextNav">
            <button v-for="item in archiveTabs" :key="item.id" :class="{ selected: workspaceMode === 'archive' && archiveView === item.id }" :aria-current="workspaceMode === 'archive' && archiveView === item.id ? 'page' : undefined" @click="navigateSection('archive', item.id)"><component :is="item.icon" :size="18" stroke="1.7" aria-hidden="true" /><span>{{ item.label }}</span></button>
          </div>
        </section>
      </nav>
      <div class="sidebarBottom">
        <button aria-label="设置" title="设置" @click="openSettings('comicOverview')">
          <icon-adjustments :size="18" />
          设置
        </button>
        <span v-if="!sidebarCollapsed" class="localNote">
          <span></span>
          本地保存 · 原创角色 · 连载创作
        </span>
      </div>
    </aside>

    <div class="studioMain">
      <header class="studioHeader">
        <div class="breadcrumb">
          {{ project?.title || "漫画创作工作台" }}
          <span>/</span>
          <strong>{{ workspaceMode === 'analysis' ? '数据分析' : workspaceMode === 'archive' ? '创作档案' : stages[stage]!.title }}</strong>
        </div>
        <div class="headerActions">

          <span class="saveState" role="status">{{ busy || (saving ? "正在保存…" : dirty ? "有未保存修改" : project ? "已保存" : "准备开始") }}</span>
          <button v-if="project" class="secondaryButton" :disabled="!!busy || saving || !dirty" @click="run('保存项目', save)">
            <icon-device-floppy :size="16" />
            保存
          </button>
        </div>
      </header>

      <main ref="studioContent" class="studioContent" :aria-busy="!!busy">
        <div v-if="lastError" class="previewWarning" role="alert">操作未完成：{{ lastError }}<button class="textButton" @click="lastError = ''">收起提示</button></div>
          <details v-if="project && workspaceMode !== 'analysis'" class="changeNote"><summary>修改说明与记录<span>{{ changeReason ? ' · 已填写' : ' · 选填' }}</span></summary><div class="changeReason"><label for="changeReason">这次为什么修改</label><input id="changeReason" v-model="changeReason" :disabled="!!busy || saving" maxlength="3000" placeholder="选填；下次保存时与前后快照一起留存" /><button class="textButton" @click="workspaceMode = 'archive'">查看修改记录</button></div></details>
        <section v-if="!project" class="welcomePanel">
          <span class="eyebrow">从一个话题，到一篇漫画</span>
          <h1>把灵感，放进格子里。</h1>
          <p>
            在一个工作台完成选题、编剧、分镜、出图、排版和审稿。
            <br />
            让每个角色有自己的样子，让每期作品有据可循。
          </p>
          <button class="primaryButton" @click="newProjectVisible = true">
            <icon-plus :size="18" />
            创建第一个漫画项目
          </button>
          <div class="welcomeFlow">
            <span v-for="(item, index) in stages" :key="item.title">
              <b>{{ String(index + 1).padStart(2, "0") }}</b>
              {{ item.title }}
            </span>
          </div>
        </section>

        <analysisDashboard v-else-if="workspaceMode === 'analysis'" :key="directory" :project="project" :view="analysisView" :disabled="!!busy || saving" :status="analysisStatus" :automatic="collectionSettings.automatic" @collect="run('采集热点与作品数据', () => collectAnalysis())" @save="run('保存作品数据源', save)" @sync="(id) => run('同步作品数据', () => syncPublication(id))" @registered="(id) => run('登记并同步作品', async () => { await save(); if (project?.publications.find((item) => item.id === id)?.enabled) await syncPublication(id); })" @settings="openSettings('comicPlatforms')" @analyze="(platform, window) => run('AI分析作品数据', () => analyzeFeedback(platform, window))" @original="(direction) => run('创建原创选题', async () => { await startOriginal(direction); workspaceMode = 'studio'; })" />
        <personalHub v-else-if="workspaceMode === 'archive'" :key="directory" :section="archiveView" :archiveOnly="true" :project="project" :directory="directory" :disabled="!!busy || saving" :imageUrls="imageUrls" :canAnalyze="textMode === 'codex' || !!textModel" @save="run('保存创作档案', save)" @original="(direction) => run('创建原创选题', async () => { await startOriginal(direction); workspaceMode = 'studio'; })" />
        <template v-else>

          <div v-if="![0, 1, 2, 3, 4, 5].includes(stage)" class="pageHeading">
            <div>
              <span class="eyebrow">{{ stages[stage]!.eyebrow }}</span>
              <h1>{{ stages[stage]!.heading }}</h1>
              <p>{{ stages[stage]!.description }}</p>
            </div>
            <div v-if="episode" class="episodeBadge">
              <span>当前作品</span>
              <strong>{{ episode.title }}</strong>
              <small>{{ episode.styleSnapshot?.name || "尚未绑定美术版本" }}</small>
            </div>
          </div>

          <div v-if="episode && stage > 0 && ![1, 2, 3, 4, 5].includes(stage)" class="productionStatus" aria-label="本期制作状态">
            <button @click="stage = 1">{{ episode.story ? '✓' : '○' }} 故事脚本</button>
            <button @click="stage = 3">{{ episode.styleSnapshot ? '✓' : '○' }} 美术风格 · {{ episode.castSnapshot.length }} 位角色</button>
            <button @click="stage = 4">{{ (episode.productionMode === 'direct' ? episode.directPages : episode.panels).filter((panel) => panel.image).length }} / {{ (episode.productionMode === 'direct' ? episode.directPages : episode.panels).length }} {{ episode.productionMode === 'direct' ? '页' : '格' }}出图</button>
            <button @click="stage = 6">整体效果预览</button>
          </div>
          <div v-if="generationProgress.active" class="generationStatus" role="status" aria-live="polite"><strong>{{ generationProgress.phase }}</strong><span>{{ generationProgress.model }} · 已用 {{ generationProgress.elapsedSeconds }} 秒</span><progress aria-label="图片生成处理中"></progress><small>模型未提供精确百分比；完成后会保存图片。重画结果先与旧版对比，再由你选择。</small></div>
          <div v-if="busy.startsWith('整页生成 ')" class="batchControl" role="status"><span>{{ busy }} · 不覆盖已有页面</span><button class="secondaryButton" :disabled="stopDirectBatch" @click="stopDirectBatch = true">{{ stopDirectBatch ? '当前页结束后停止' : '当前页完成后停止' }}</button></div>
          <fieldset class="stageFields" :disabled="!!busy || saving">
            <section v-if="stage === 0" class="topicsStage">
              <header class="discoveryHeader"><div><span class="eyebrow">START A STORY</span><h1>今天，想画什么故事？</h1><p>带着自己的想法开始，或从生活热点里找灵感。</p></div><details v-if="project.episodes.length" class="resumeStories"><summary>继续已有作品 · {{ project.episodes.length }}</summary><button v-for="item in project.episodes" :key="item.id" @click="project.activeEpisodeId = item.id; stage = 1">{{ item.title }}</button></details></header>
              <div class="startChoices" aria-label="创作起点"><button :class="{ selected: ['hot', 'research'].includes(ideaMode) }" :aria-pressed="['hot', 'research'].includes(ideaMode)" @click="ideaMode = 'hot'"><icon-search :size="20" /><span><strong>找灵感</strong><small>搜索热梗，挑选改编方向</small></span></button><button :class="{ selected: ['ownStory', 'series', 'serial'].includes(ideaMode) }" :aria-pressed="['ownStory', 'series', 'serial'].includes(ideaMode)" @click="ideaMode = 'ownStory'"><icon-pencil :size="20" /><span><strong>自己写故事</strong><small>一句想法、完整剧情或连载</small></span></button></div>
              <div v-if="['ownStory', 'series', 'serial'].includes(ideaMode)" class="writingChoices"><button v-for="item in [{ id: 'ownStory', label: '已有完整剧情' }, { id: 'series', label: '只有一句想法' }, { id: 'serial', label: '继续连载' }]" :key="item.id" :class="{ selected: ideaMode === item.id }" :aria-pressed="ideaMode === item.id" @click="ideaMode = item.id">{{ item.label }}</button></div>
              <div v-if="ideaMode === 'ownStory'" class="surface"><h2>把自己的剧情变成漫画</h2><label for="ownStory">粘贴剧情或导入文字文件</label><textarea id="ownStory" v-model="originalStory" rows="7" maxlength="10000" placeholder="直接粘贴自己的故事、对话或已写好的分镜，不用先选热点。"></textarea><label class="secondaryButton uploadButton" tabindex="0" role="button" @keydown.enter.prevent="activateUpload" @keydown.space.prevent="activateUpload">导入 TXT / Markdown<input type="file" accept=".txt,.md,text/plain,text/markdown" @change="importStory" /></label><details class="castingOptions"><summary>出场角色 · 可稍后选角</summary><label for="ownCastMode">角色方式</label><select id="ownCastMode" v-model="originalCastMode"><option value="new">根据剧情建立新角色</option><option value="fixed" :disabled="!project.characters.length">使用固定角色</option></select><div v-if="originalCastMode === 'fixed'" class="inlineFields"><label v-for="character in project.characters" :key="character.id" class="checkLabel"><input v-model="originalCharacterIds" type="checkbox" :value="character.id" />{{ character.name }}</label></div></details><button class="primaryButton" :disabled="!originalStory.trim() || (originalCastMode === 'fixed' && !originalCharacterIds.length)" @click="run('保存自带剧情', () => startFromStory(originalStory, originalCastMode === 'fixed', originalCastMode === 'fixed' ? originalCharacterIds : undefined))">保存剧情，进入脚本与分镜</button><p class="helperText">这里只保存，不调用模型。下一步可继续编辑，按需拆成分镜。</p></div>
              <div v-if="ideaMode === 'series'" class="surface"><h2>一句想法也能开始</h2><p class="helperText">先建立选题，下一步再生成脚本并选择出场角色。</p><label for="studioOriginal">生活观察或关键词</label><input id="studioOriginal" v-model="originalDirection" maxlength="3500" placeholder="例如：下班后只想安静的 I 人，和热情的同事" /><details class="castingOptions"><summary>出场角色 · 可稍后选角</summary><label for="originalCastMode">角色方式</label><select id="originalCastMode" v-model="originalCastMode"><option value="new">先创作故事，AI 建立新角色</option><option value="fixed" :disabled="!project.characters.length">使用固定角色库 · {{ project.characters.length }} 位</option></select><div v-if="originalCastMode === 'fixed'" class="inlineFields"><label v-for="character in project.characters" :key="character.id" class="checkLabel"><input v-model="originalCharacterIds" type="checkbox" :value="character.id" />{{ character.name }}</label></div></details><button class="primaryButton" :disabled="!originalDirection.trim() || (originalCastMode === 'fixed' && !originalCharacterIds.length)" @click="run('创建原创选题', () => startOriginal(originalDirection, originalCastMode === 'fixed', originalCastMode === 'fixed' ? originalCharacterIds : undefined))">{{ originalCastMode === 'fixed' ? '使用所选角色开始创作' : '先写故事，建立角色' }}</button></div>
              <seriesDesk v-if="ideaMode === 'serial'" :project="project" :disabled="!!busy || saving" @save="run('保存连载设定', save)" @select="(id) => run('切换连载作品', async () => { project!.activeEpisodeId = id; await save(); })" @next="(direction) => run('创建下一集', () => startNextEpisode(direction))" />
              <div v-if="ideaMode === 'research'" class="researchBack"><button class="textButton" @click="ideaMode = 'hot'">← 返回灵感列表</button><span>补充素材后，再开始创作</span></div>
              <researchDesk v-if="ideaMode === 'research'" v-model:keyword="researchKeyword" :project="project" :disabled="!!busy || saving" :status="researchStatus" @collect="(keyword, platforms) => run('多平台收集专题素材', () => collectResearch(keyword, platforms))" @save="run('保存研究笔记', save)" @use="(id) => run('采用专题素材包', () => useResearchPack(id))" @detail="(packId, topicId) => run('读取笔记正文', () => readResearchSource(packId, topicId))" />

              <template v-if="ideaMode === 'hot'">
              <section class="surface discoverySearch" aria-label="搜索灵感">
                <label for="searchKeyword">想找什么题材？</label><div class="discoverySearchRow"><input id="searchKeyword" v-model="searchKeyword" maxlength="80" placeholder="职场反串、情侣嘴硬、生活冷知识……" @keydown.enter.prevent="searchInspirations" /><button class="primaryButton" @click="searchInspirations">{{ searchKeyword.trim() && searchAcross ? '跨平台找灵感' : '发现剧情灵感' }} <icon-arrow-right :size="15" /></button></div>
                <div class="suggestedKeywords"><span>试试</span><button v-for="keyword in ['职场反串', '情侣嘴硬', 'MBTI趣谈', '生活冷知识']" :key="keyword" @click="searchKeyword = keyword">{{ keyword }}</button></div>
                <details class="discoveryOptions"><summary>搜索范围与来源 · {{ searchAcross && searchKeyword.trim() ? '多平台' : '单个平台' }}</summary><div class="inlineFields"><label><input v-model="searchAcross" type="checkbox" />有关键词时跨平台搜索</label><label for="sourceSelect">单平台 / 热榜</label><select id="sourceSelect" v-model="source"><option value="bilibili">B站</option><option value="douyin">抖音</option><option value="xhsLocal">小红书 · 需登录</option><option value="tieba">弱智吧</option><option value="douban">豆瓣</option><option value="ithome">IT之家</option><option value="solidot">Solidot</option></select><button class="textButton" @click="connectionsVisible = true">平台连接与登录</button><button class="textButton" @click="source === 'xhsLocal' && !xhsConnected ? connectionsVisible = true : run('获取热点关键词', refreshTopics)">只收集原始关键词</button></div><p class="helperText">没有关键词时读取所选平台热点。整理改编方向会调用文本模型。</p></details>
                <div class="discoveryUtilities"><button class="textButton" @click="topicVisible = true">＋ 添加自己的来源</button><button class="textButton" @click="researchTopic(searchKeyword)">素材包 / 深入查找</button></div><p v-if="sourceMessage || researchStatus" class="searchStatus" role="status">{{ sourceMessage }} {{ researchStatus }}</p>
              </section>
              <div v-if="!project.memeIdeas.length && !project.topics.length" class="discoveryEmpty"><h3>先找一个你想讲的主题</h3><p>搜索后在这里挑选改编方向，也可以直接带入自己的故事。</p></div>
              <section v-if="project.memeIdeas.length" class="inspirationResults">
                <div class="sectionTitle">
                  <h2>可以这样画 <small>{{ project.memeIdeas.length }} 个方向</small></h2>
                  <span>按改编潜力推荐</span>
                </div>
                <p class="helperText">
                  以下开场、冲突和反转均为原创改编提案。来源通常只有热搜标题，原梗玩法需另行核对；热度是平台原值，与改编潜力分开判断。
                </p>
                <div class="topicGrid">
                  <article v-for="idea in project.memeIdeas" :key="idea.topicId" class="topicCard">
                    <span class="sourceTag">{{ idea.theme }}</span>
                    <h2>{{ idea.hook }}</h2>
                    <p>{{ idea.conflict }}</p><details class="ideaDetails"><summary>展开剧情与核对信息</summary><p><strong>开场：</strong>{{ idea.setup }}</p><p><strong>反转：</strong>{{ idea.twist }}</p><p class="helperText">待核对：{{ idea.verification }}</p></details>
                    <div v-if="project.topics.find((topic) => topic.id === idea.topicId)" class="cardMeta">
                      <span>{{ project.topics.find((topic) => topic.id === idea.topicId)?.title }}</span>
                      <span>{{ project.topics.find((topic) => topic.id === idea.topicId)?.metric }}</span>
                    </div>
                    <div class="cardFooter">
                      <a
                        :href="safeLink(project.topics.find((topic) => topic.id === idea.topicId)?.url || '')"
                        target="_blank"
                        rel="noopener noreferrer">
                        查看原梗线索
                      </a>
                      <button class="textButton" @click="researchTopic(idea.hook)">多平台研究这个梗</button><button class="primaryButton" @click="run('采用剧情梗', () => selectMeme(idea))">
                        用这个方向写漫画
                        <icon-arrow-right :size="15" />
                      </button>
                    </div>
                  </article>
                </div>
              </section>
              <details class="rawTopics" :open="!project.memeIdeas.length">
                <summary>查看原始话题与来源 · {{ project.topics.length }} 条</summary>
                <button class="secondaryButton" @click="source === 'xhsLocal' && !xhsConnected ? connectionsVisible = true : run('获取话题候选', refreshTopics)"><icon-refresh :size="16" />只获取话题，不分析剧情</button>
              <p class="helperText">
                热搜聚合保留榜位与热度，链接为搜索线索；小红书登录搜索是近期高赞候选；RSS
                是最新资讯。分类为关键词筛选，可能漏选。选题后请补充可靠原文。{{ fetchedAt ? `最近获取：${formatTime(fetchedAt)}` : "" }}
              </p>
              <div class="toolbar">
                <div class="inlineFields">
                  <label for="topicCategory">选题方向</label>
                  <select id="topicCategory" v-model="topicCategory">
                    <option value="all">全部候选</option>
                    <option value="science">科普线索（关键词）</option>
                    <option value="entertainment">娱乐线索（关键词）</option>
                  </select>
                  <input v-model="topicKeyword" aria-label="筛选已采集话题" placeholder="输入关键词进一步筛选" />
                </div>
                <span class="countLabel">显示 {{ visibleTopics.length }} / {{ project.topics.length }} 条</span>
              </div>
              <div class="topicGrid">
                <article v-for="topic in visibleTopics" :key="topic.id" class="topicCard">
                  <div class="cardMeta">
                    <span>{{ topic.source }}</span>
                    <time>{{ formatTime(topic.collectedAt || topic.publishedAt) }}</time>
                  </div>
                  <span v-if="topic.rank || topic.metric" class="sourceTag">{{ topic.rank ? `榜位 ${topic.rank} · ` : "" }}{{ topic.metric }}</span>
                  <h2>{{ topic.title }}</h2>
                  <p>{{ topic.summary.slice(0, 160) }}</p>
                  <div class="cardFooter">
                    <a v-if="safeLink(topic.url)" :href="safeLink(topic.url)" target="_blank" rel="noopener noreferrer">
                      查看来源
                      <icon-arrow-up-right :size="14" />
                    </a>
                    <button class="textButton" @click="originalDirection = [originalDirection, topic.title].filter(Boolean).join('；').slice(0, 3500); ideaMode = 'series'">作为原创灵感</button>
                    <button class="textButton" @click="researchTopic(topic.title)">跨平台找相关剧情</button><button class="textButton" @click="run('创建本期作品', () => selectTopic(topic))">
                      用这个选题
                      <icon-arrow-right :size="15" />
                    </button>
                  </div>
                </article>
              </div>
              </details>
              </template>
            </section>

            <section v-else-if="stage === 1 && episode" class="writingWorkspace">
              <header class="productionHeader"><div><h2>先把故事讲好</h2><p>编辑正文，确定表达方向，再细化每格画面。</p></div><button class="secondaryButton" @click="stage = 2">查看分镜 · {{ episode.panels.length }} 格 →</button></header>
              <div v-if="!episode.topic.verified" class="writingNotice"><span>{{ hasOnlyTopicClue ? '当前只有热点线索，请先确定如何使用。' : '来源尚未核对，请选择创作方式。' }}</span><button class="textButton" @click="useTopicAsInspiration">只借关键词写原创</button><button class="textButton" @click="scriptSourceOpen = true">补充并核对来源</button></div>
              <p v-if="scriptIssue" class="scriptIssue" role="alert">{{ scriptIssue }}</p>
              <div class="writingColumns">
                <div class="surface manuscript"><div class="sectionTitle"><h3>故事正文</h3><span>{{ episode.story.length }} 字 · 可直接编辑</span></div><label for="episodeTitle">作品标题</label><input id="episodeTitle" v-model="episode.title" maxlength="200" /><label for="story">正文与角色对话</label><textarea id="story" v-model="episode.story" class="storyEditor" rows="18" placeholder="写下故事和人物对话，也可以在右侧设置方向后使用 AI 创作。" /><p class="helperText">正文与分镜分别保存。修改正文后，已有分镜不会自动覆盖。</p></div>
                <aside class="writingInspector">
                  <section class="surface"><h3>创作方向</h3><label for="storyMode">这篇靠什么吸引读者？</label><select id="storyMode" v-model="episode.storyMode"><option value="satire">反串喜剧 · 抬杠、递进与回扣</option><option value="science">科普教学 · 原理、例子与边界</option><option value="drama">情感剧情 · 动机、潜台词与细节</option></select><label for="targetPanels">计划长度 · {{ episode.targetPanels }} 格</label><input id="targetPanels" v-model.number="episode.targetPanels" type="range" min="2" max="12" /><label for="direction">补充要求</label><textarea id="direction" v-model="episode.direction" rows="3" placeholder="你想要的笑点、知识点或情感变化……" />
                  <button class="primaryButton writeAction" @click="requestStory"><icon-sparkles :size="16" />{{ episode.story.trim() ? '按正文生成分镜' : '生成脚本与分镜' }}</button><p class="helperText">{{ episode.panels.length ? '重新生成前会确认，并保留历史快照。' : '点击才调用文本模型，也可以手动添加分镜。' }}</p>
                  <details class="writingDetails"><summary>文本模型 · {{ textMode === 'codex' ? `Codex · ${codexModel || '默认'}` : textModels.find(item => `${item.providerId}/${item.modelId}` === textModel)?.label || '未配置' }}</summary><p class="helperText">{{ textMode === 'codex' ? '通过本机 CLI 联网调用，使用当前账号额度。' : '使用设置中选择的 API 或本地服务。' }}</p><button class="secondaryButton" @click="openSettings('comicDefaults')">更换 / 配置模型</button></details></section>
                  <details class="surface writingDetails" :open="scriptSourceOpen" @toggle="scriptSourceOpen = ($event.target as HTMLDetailsElement).open"><summary>{{ isOriginalEpisode ? '灵感与参考' : '来源素材' }} · {{ episode.topic.verified ? '已确认' : '待核对' }}</summary>
                  <span class="sourceTag">{{ episode.topic.source }}</span>
                  <h3>{{ episode.topic.title }}</h3>
                  <a v-if="safeLink(episode.topic.url)" :href="safeLink(episode.topic.url)" target="_blank" rel="noopener noreferrer">
                    打开原始来源
                    <icon-external-link :size="14" />
                  </a>
                  <label for="factSummary">{{ isOriginalEpisode ? "原创前提与参考说明" : "素材正文或已核对摘要" }}</label>
                  <textarea id="factSummary" v-model="episode.topic.summary" rows="8"></textarea>
                  <label class="checkLabel">
                    <input id="sourceVerified" v-model="episode.topic.verified" type="checkbox" />
                    {{ isOriginalEpisode ? "按原创虚构创作，涉及事实另行核对" : "我已核对来源，虚构剧情与事实分开表达" }}
                  </label>
<button class="textButton" @click="researchTopic(episode.topic.title); stage = 0">继续查找素材 →</button></details>
                  <details class="surface writingDetails"><summary>出场角色与画风 · {{ episode.castSnapshot.length }} 位角色</summary>
                  <p>美术：{{ episode.styleSnapshot?.name || "尚未绑定" }}</p>
                  <p>角色：{{ episode.castSnapshot.map((item) => item.name).join("、") || "尚未设置" }}</p>
                  <button class="textButton" @click="stage = 3">
                    前往角色与美术
                    <icon-arrow-right :size="15" />
                  </button>
                  <small>文本与生图分别配置。可以先写故事，再绑定固定角色和画风，最后逐格出图。</small>
</details>
                </aside>
              </div>
            </section>

            <section v-else-if="stage === 2 && episode">
              <header class="productionHeader"><div><h2>把故事安排成画面</h2><p>{{ episode.panels.length }} 格 · 点击左侧画格，编辑场景、出场人物和台词。</p></div><div class="panelActions"><button class="textButton" @click="stage = 1">← 返回脚本</button><button class="secondaryButton" @click="stage = 3">选角色与画风 →</button><button class="primaryButton" :disabled="!episode.panels.length" @click="stage = 4">进入漫画制作 →</button></div></header>
              <details class="surface boardStory"><summary>对照故事正文 · {{ episode.title }}</summary><p>{{ episode.story || '还没有正文，可返回脚本编写。' }}</p></details>
              <div class="boardWorkspace">
                <nav class="boardRail" aria-label="分镜导航"><div class="boardRailTitle"><strong>阅读顺序</strong><button class="textButton" @click="addStoryboardPanel">＋ 新增</button></div><button v-for="(panel, index) in episode.panels" :key="panel.id" :class="{ selected: storyboardPanelId === panel.id }" :aria-pressed="storyboardPanelId === panel.id" @click="storyboardPanelId = panel.id"><span class="boardNumber">{{ String(index + 1).padStart(2, '0') }}</span><span><strong>第 {{ index + 1 }} 格</strong><small>{{ panel.action.slice(0, 45) || '还没有画面描述' }}</small></span></button></nav>
                <div v-if="!episode.panels.length" class="boardEmpty"><h3>先建立第一个画面</h3><p>可以手动编排，也可以返回脚本由 AI 拆分。</p><button class="primaryButton" @click="addStoryboardPanel">新增第一格</button></div>
              <div class="storyboardList">
                <article v-for="(panel, index) in episode.panels" :key="panel.id" v-show="storyboardPanelId === panel.id" class="storyboardRow">
                  <div class="frameIndex">
                    <strong>{{ String(index + 1).padStart(2, "0") }}</strong>
                    <div>
                      <button :disabled="index === 0" :aria-label="`上移第 ${index + 1} 格`" @click="movePanel(index, -1)">
                        <icon-arrow-up :size="15" />
                      </button>
                      <button :disabled="index === episode.panels.length - 1" :aria-label="`下移第 ${index + 1} 格`" @click="movePanel(index, 1)">
                        <icon-arrow-down :size="15" />
                      </button>
                    </div>
                  </div>
                  <div class="storyboardText">
                    <h3>场景与人物</h3>
                    <label :for="`action${index}`">画面与动作</label>
                    <textarea :id="`action${index}`" v-model="panel.action" rows="5"></textarea>
                    <details class="boardDetails"><summary>镜头景别 · {{ panel.shot || '未指定' }}</summary><label :for="`shot${index}`">景别与构图</label><input :id="`shot${index}`" v-model="panel.shot" placeholder="例如：近景、从门口看向房间" /></details><label>本格出场角色</label><p v-if="!episode.castSnapshot.length" class="helperText">还没有角色。<button class="textButton" @click="stage = 3">前往选角</button></p>
                    <div class="characterChecks">
                      <label v-for="character in episode.castSnapshot" :key="character.id" class="checkLabel">
                        <input v-model="panel.characters" type="checkbox" :value="character.id" />
                        {{ character.name }}
                      </label>
                    </div>
                    <div v-for="person in episode.castSnapshot.filter((item) => panel.characters.includes(item.id))" :key="person.id" class="actingEditor"><details><summary>{{ person.name }} · 情绪、动作与心声</summary><p class="helperText">性格：{{ person.personality || '尚未填写，可在角色档案中补充' }}</p><button v-if="!panel.performances.some((item) => item.characterId === person.id)" class="secondaryButton" @click="panel.performances.push({ characterId: person.id, emotion: '', expression: '', pose: '', thought: '' })">添加情绪与动作</button><template v-for="acting in panel.performances.filter((item) => item.characterId === person.id)" :key="acting.characterId"><label :for="`emotion${panel.id}${person.id}`">情绪</label><input :id="`emotion${panel.id}${person.id}`" v-model="acting.emotion" maxlength="300" placeholder="惊喜、失落、强忍笑意……" /><label :for="`expression${panel.id}${person.id}`">眼眉嘴的表情</label><input :id="`expression${panel.id}${person.id}`" v-model="acting.expression" maxlength="500" placeholder="眼睛睁大，眉毛上扬，嘴巴微张" /><label :for="`pose${panel.id}${person.id}`">肢体、视线与动作</label><input :id="`pose${panel.id}${person.id}`" v-model="acting.pose" maxlength="500" /><label :for="`thought${panel.id}${person.id}`">内心独白 · 排版页可添加为心声气泡</label><textarea :id="`thought${panel.id}${person.id}`" v-model="acting.thought" maxlength="600" rows="2"></textarea></template></details></div>
                  </div>
                  <div class="storyboardDialogue">
                    <div class="dialogueHeader"><h3>台词与说话者</h3><button class="textButton" :disabled="panel.speech.length >= 6" @click="addStoryboardSpeech(panel)">＋ 添加</button></div>
                    <p v-if="!panel.speech.length" class="helperText">本格暂无结构化台词，可以添加对白，或展开下方批量编辑。</p>
                    <div v-for="(speech, speechIndex) in panel.speech" :key="speech.id" class="boardSpeech"><div class="boardSpeechHeader"><label :for="`speaker${panel.id}${speechIndex}`">{{ speech.kind === 'thought' ? '心声' : speech.kind === 'narration' ? '旁白' : '台词' }} {{ speechIndex + 1 }}</label><button class="textButton" :aria-label="`移除第 ${speechIndex + 1} 句`" @click="removeStoryboardSpeech(panel, speechIndex)">移除</button></div><select :id="`speaker${panel.id}${speechIndex}`" v-model="speech.speakerId" @change="syncSpeechActor(panel, speechIndex)"><option value="">未指定角色</option><option v-for="person in episode.castSnapshot" :key="person.id" :value="person.id">{{ person.name }}</option></select><small v-if="speech.speakerId">{{ episode.castSnapshot.find(person => person.id === speech.speakerId)?.personality || '角色尚未填写性格' }}</small><textarea v-model="speech.text" :aria-label="`第 ${speechIndex + 1} 句内容`" rows="2" maxlength="600" @input="syncSpeechActor(panel, speechIndex)" /></div>
                    <details class="boardDetails"><summary>批量编辑对白</summary><p class="helperText">每行写“角色名：台词”。修改此处会重新拆分气泡，已调好的气泡位置需重新检查。</p><label :for="`dialogue${index}`">整格对白</label><textarea :id="`dialogue${index}`" v-model="panel.dialogue" @input="panel.speech = splitDialogue(panel, episode.castSnapshot)" rows="4" maxlength="5000" /></details>
                    <details class="boardDetails"><summary>画外旁白与音效</summary>
                    <label :for="`caption${index}`">旁白</label>
                    <textarea :id="`caption${index}`" v-model="panel.caption" rows="2" maxlength="300"></textarea>
                    <label :for="`sfx${index}`">拟声词 / 音效字</label>
                    <input :id="`sfx${index}`" v-model="panel.sfx" maxlength="40" placeholder="叮—— / 咚咚 / 喵" /></details>
                  </div>
                </article>
              </div>
              </div>
            </section>

            <section v-else-if="stage === 3" class="assetsStage">
              <header class="productionHeader"><div><h2>为故事选好角色与画风</h2><p>公共库跨作品复用，本篇选用独立保存。</p></div><button class="primaryButton" :disabled="!episode" @click="stage = 4">进入漫画制作 →</button></header>
              <div class="artNavigation" role="tablist" aria-label="角色与美术工作区"><button role="tab" :aria-selected="artTab === 'characters'" :class="{ selected: artTab === 'characters' }" @click="artTab = 'characters'">角色 · {{ episode?.castSnapshot.length || 0 }} 位已选</button><button role="tab" :aria-selected="artTab === 'styles'" :class="{ selected: artTab === 'styles' }" @click="artTab = 'styles'">画风 · {{ episode?.styleSnapshot?.name || activeStyle?.name || '未选择' }}</button></div>
              <details v-if="episode && artTab === 'characters'" class="artBindingDetails"><summary>剧情人物绑定 · 选好角色后在这里匹配姓名与出场</summary>
              <section v-if="episode && storySpeakers.length" class="surface castingOverview"><h3>剧本人物 → 固定形象</h3><button class="secondaryButton" @click="run('统一剧情人物名', synchronizeCastNames)">将已绑定姓名同步到剧情与对白</button><p>选择角色只加入本篇名单。在这里指定谁来出演，关联外形、性格和台词；之后仍可逐格微调。</p><div v-for="name in storySpeakers" :key="name"><label :for="`castRole${name}`">{{ name }}</label><select :id="`castRole${name}`" :value="castForSpeaker(name)" @change="run('调整剧本人物绑定', () => assignStoryRole(name, ($event.target as HTMLSelectElement).value))"><option value="">尚未绑定</option><option v-for="person in episode.castSnapshot" :key="person.id" :value="person.id">{{ person.name }} · {{ person.personality.slice(0, 25) || '未设性格' }}</option></select><details v-if="castForSpeaker(name)"><summary>旧名与简称 · 需要时补充</summary><label>剧情中对这个人的其他称呼<input :value="episode.castSnapshot.find(person => person.id === castForSpeaker(name))?.aliases" @input="setStoryAliases(name, ($event.target as HTMLInputElement).value)" placeholder="例如：蓝原柚子，柚子" maxlength="500" /></label><p class="helperText">用逗号隔开；填写后点击上方同步姓名。不会猜测可能属于其他人物的简称。</p></details></div></section>
              <details v-if="episode" class="surface castingOverview"><summary>角色绑定 · 查看与调整每格出场人物</summary><p>选入公共库角色只加入本篇演员名单，不会自动替换已有分镜人物。下方可直接调整每格；对白说话者在分镜或字幕页调整。</p><div v-for="(panel, index) in episode.panels" :key="panel.id"><strong>第 {{ index + 1 }} 格</strong><span>{{ episode.castSnapshot.filter((person) => panel.characters.includes(person.id)).map((person) => person.name).join('、') || '未分配角色' }}</span><label v-for="person in episode.castSnapshot" :key="person.id"><input v-model="panel.characters" type="checkbox" :value="person.id" />{{ person.name }}</label><button class="textButton" @click="stage = 2">调整台词与表演</button></div></details>
              </details>
              <artLibrary :kind="artTab === 'characters' ? 'characters' : 'styles'" :imageModel="imageModels.find((item) => `${item.providerId}/${item.modelId}` === imageModel)" :requestImage="requestImage" :apply="applyLibraryItem" :selectedItems="artTab === 'characters' ? episode?.castSnapshot || project.characters : episode?.styleSnapshot ? [episode.styleSnapshot] : activeStyle ? [activeStyle] : []" :selectedUrls="imageUrls" :activeStyleId="episode?.styleSnapshot?.id || project.activeStyleId" :remove="removeLibraryItem" :analyzeDesign="analyzeLibrary" :analysisLabel="analysisServiceLabel" />
              <p v-if="episode?.styleSnapshot" class="helperText">本篇画风：{{ episode.styleSnapshot.name }}。换画风用于后续生成，已有图片需重新绘制。{{ episode.panels.some((panel) => panel.imagePromptOverride) ? '注意：部分分格使用自定义提示词，会覆盖自动整理的画风描述，请在分格出图中检查。' : '' }}</p>
              <details class="surface modelDisclosure"><summary>出图与图片分析设置 · {{ imageModels.find((item) => `${item.providerId}/${item.modelId}` === imageModel)?.label || '未选择服务' }}</summary><h2>本次设计使用的模型</h2><label for="referenceAnalysisMode">图片分析服务</label><select id="referenceAnalysisMode" v-model="referenceAnalysisMode"><option value="selected">{{ textServiceLabel }} · 须支持图片输入</option><option value="codex">Codex · 需已安装并登录，单独用于识图</option></select><p class="helperText">{{ referenceAnalysisMode === 'codex' ? '分析通过 Codex CLI 联网，使用当前账号额度；不会改变编剧模型。' : `当前：${textMode === 'codex' ? 'Codex CLI' : textModels.find((item) => `${item.providerId}/${item.modelId}` === textModel)?.label || '尚未配置文本模型'}。纯文本模型不能分析图片，可改选 Codex 或更换支持识图的文本模型。` }}</p><label for="designImageModel">设计出图服务 · 角色与画风共用</label><select id="designImageModel" v-model="imageModel"><option value="">请选择已配置的生图服务</option><option v-for="model in imageModels.filter((item) => item.configured || `${item.providerId}/${item.modelId}` === imageModel)" :key="model.providerId + model.modelId" :value="`${model.providerId}/${model.modelId}`">{{ model.label }}</option></select><template v-if="imageModel === 'zImage/turbo4bit'"><label for="designQuality">本地设计画质</label><select id="designQuality" v-model="zImageQuality"><option value="draft">草稿 · 384×512，仅验证通路</option><option value="standard">标准 · 768×1024</option><option value="detail">细节 · 896×1152，较慢</option></select><p class="helperText">普通图生图无法锁定身份。复杂角色建议先做单人立绘；严格保持多角色需要配置含身份参考约束的 ComfyUI 工作流或支持角色参考的 API，单纯增加提示词不能保证。</p></template><div class="panelActions"><button class="secondaryButton" @click="openSettings('mediaModel')">添加在线图片 API / ComfyUI</button><button class="secondaryButton" @click="openSettings('comicLocal')">检测本地模型</button></div><p class="helperText">分析和出图是两次独立操作，点击才调用。图像分析结果先确认和修改，再生成角色或画风样张。</p></details>
            </section>

            <section v-else-if="stage === 4 && episode">
              <header class="productionHeader"><div><h2>{{ episode.title }}</h2><p>{{ episode.styleSnapshot?.name || '未选择画风' }} · {{ episode.castSnapshot.length }} 位角色</p></div><button class="secondaryButton" @click="stage = 6">预览与导出 →</button></header>
              <div class="productionNavigation"><div class="productionModes" aria-label="漫画制作方式"><button :class="{ selected: episode.productionMode === 'direct' }" :aria-pressed="episode.productionMode === 'direct'" @click="episode.productionMode = 'direct'">整页直出<small>画面与台词一次生成</small></button><button :class="{ selected: episode.productionMode === 'panels' }" :aria-pressed="episode.productionMode === 'panels'" @click="episode.productionMode = 'panels'">分格制作<small>逐格绘图，自由拼页排字</small></button></div></div>
              <details class="productionSettings"><summary>生成设置 · {{ imageModels.find(item => `${item.providerId}/${item.modelId}` === imageModel)?.label || '尚未选择图片服务' }}</summary>
              <div class="toolbar">
                <div class="inlineFields">
                  <label for="imageModel">图片服务</label>
                  <select id="imageModel" v-model="imageModel">
                    <option value="">选择已配置的图片服务</option>
                    <option v-for="model in imageModels.filter((item) => item.configured || `${item.providerId}/${item.modelId}` === imageModel)" :disabled="!model.configured" :key="model.providerId + model.modelId" :value="`${model.providerId}/${model.modelId}`">
                      {{ model.label }}
                    </option>
                  </select>
                  <template v-if="['zImage/turbo4bit', 'fluxKlein/klein4bit'].includes(imageModel)"><label for="zImageQuality">本地画质</label><select id="zImageQuality" v-model="zImageQuality"><option value="draft">草稿验证 · 384×512</option><option value="standard">标准清晰 · 768×1024</option><option value="detail">细节优先 · 896×1152 · 较慢</option></select></template><template v-if="imageModel === 'zImage/turbo4bit' && episode.productionMode === 'panels'"><label for="zImageReferenceMode">本地参考方式</label><select id="zImageReferenceMode" v-model="zImageReferenceMode"><option value="text">按分镜重绘 · 支持单人和多人</option><option value="reference">参考本格旧图 · 修订画面</option></select></template>
                  <button class="secondaryButton" @click="openSettings('comicDefaults')">配置服务</button>
                  <button v-if="episode.productionMode === 'panels'" class="primaryButton" :disabled="!imageModel" @click="run('连续生成待出图', generateMissingPanels)">连续生成待出图</button>
                </div>
                <button v-if="episode.productionMode === 'panels'" class="primaryButton" @click="run('打包 Codex 出图任务', exportCodexTask)">
                  <icon-package-export :size="16" />
                  手动协作：导出任务包
                </button>
              </div>
              </details>
              <directPageEditor v-if="episode.productionMode === 'direct'" :episode="episode" :imageUrls="imageUrls" :busy="!!busy" :progress="generationProgress" :generationIssue="productionIssue" @generateAll="run('连续生成漫画页', generateDirectPages)" @import="(page, file) => run('导入整页漫画', () => adoptImage(page, file, directPageInput(episode!, page).fingerprint, true))" @generate="page => run('生成整页漫画', () => generateDirectPage(page))" @resolve="(page, accept) => run('保存整页版本', () => resolveDirectPage(page, accept))" />
              <template v-else>
              <div class="productionSteps"><strong>1 绘制画面 · {{ episode.panels.filter(panel => panel.image).length }}/{{ episode.panels.length }}</strong><button class="textButton" @click="letteringPanel = drawingPanel; stage = 5">2 拼页与气泡 →</button><span>每次绘制一格无字画面，台词在下一步排版。</span></div>
              <div v-if="!episode.panels.length" class="surface productionEmpty"><h3>还没有可绘制的画格</h3><p>先完成故事和分镜，再回来生成画面。</p><button class="primaryButton" @click="stage = 2">前往分镜设计</button></div>
              <div v-else class="panelWorkspace">
              <div class="letteringTabs drawingTabs" aria-label="选择要绘制的画面"><button v-for="(panel, index) in episode.panels" :key="panel.id" :class="{ selected: drawingPanel === index }" :aria-pressed="drawingPanel === index" @click="drawingPanel = index"><img v-if="panel.image" :src="imageUrls[panel.image]" alt="" /><span>第 {{ index + 1 }} 格 · {{ panel.image ? '已有图' : '待生成' }}</span></button></div>
              <div class="imageGrid singlePanelGrid">
                <article v-for="(panel, index) in episode.panels" v-show="drawingPanel === index" :key="panel.id" class="imageCard">
                  <div class="panelArt">
                    <img v-if="panel.image" :src="imageUrls[panel.image]" :alt="`第${index + 1}格漫画`" />
                    <span v-else>
                      <icon-photo :size="32" />
                      等待第 {{ index + 1 }} 格出图
                    </span>
                    <span class="artIndex">{{ String(index + 1).padStart(2, "0") }}</span>
                    <div v-if="generationProgress.active && generationProgress.panelId === panel.id" class="panelGeneration"><strong>{{ generationProgress.phase }}</strong><progress :aria-label="`第${index + 1}格生成中`"></progress><span>{{ generationProgress.elapsedSeconds }} 秒 · 旧图已保留</span></div>
                  </div>
                  <div class="imageCardBody">
                    <div class="frameNavigator"><h3>第 {{ index + 1 }} / {{ episode.panels.length }} 格</h3><button class="textButton" :disabled="index === 0" aria-label="上一画格" @click="drawingPanel--">←</button><button class="textButton" :disabled="index === episode.panels.length - 1" aria-label="下一画格" @click="drawingPanel++">→</button></div>                    <div class="panelActions">
                      <button class="primaryButton" :disabled="!!busy || !!panel.candidate || !!panelGenerationIssue(panel) || !!productionIssue" @click="run(`生成第 ${index + 1} 格…`, async () => { await generatePanel(panel); if (panel.candidate) openPanelComparison(panel); })">
                        <icon-sparkles :size="15" />
                        {{ panel.image ? "重画此格" : "生成此格" }}
                      </button>
                      <label
                        class="secondaryButton uploadButton"
                        tabindex="0"
                        role="button"
                        @keydown.enter.prevent="activateUpload"
                        @keydown.space.prevent="activateUpload">
                        导入图片
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          :aria-label="`导入第 ${index + 1} 格图片`"
                          @change="uploadPanel($event, panel)" />
                      </label>
                    </div><p v-if="productionIssue" class="warningText">{{ productionIssue }}。画风在角色与美术中选择；图片服务在上方生成设置中配置。</p><label :for="`panelAction${panel.id}`">场景与动作</label><textarea :id="`panelAction${panel.id}`" v-model="panel.action" rows="4" maxlength="20000" />
                    <details class="generationBrief"><summary>优化提示词与本次修改 · 不调用模型</summary><label :for="`subject${panel.id}`">主要动作执行者</label><select :id="`subject${panel.id}`" v-model="panel.actionSubjectId"><option value="">按分镜描述</option><option v-for="character in episode.castSnapshot.filter((item) => panel.characters.includes(item.id))" :key="character.id" :value="character.id">{{ character.name }}</option></select><label :for="`actionContract${panel.id}`">谁对什么做什么</label><textarea :id="`actionContract${panel.id}`" v-model="panel.actionInstruction" rows="3" maxlength="2000" placeholder="例如：只有橘猫橘子用嘴叼袜子；阿暖在右侧摊开右手，嘴巴闭合。画面只有一人一猫。"></textarea><label :for="`revision${panel.id}`">本次重画要求</label><textarea :id="`revision${panel.id}`" v-model="panel.revisionRequest" rows="2" maxlength="2000" placeholder="指出上一版的错误及应保留的内容。"></textarea><label :for="`exactPrompt${panel.id}`">直接使用自己的生图提示词 · 留空则自动整理</label><textarea :id="`exactPrompt${panel.id}`" v-model="panel.imagePromptOverride" rows="4" maxlength="8000" placeholder="填写后原文提交，不额外拼接或改写；本地模型上限512 tokens，长提示词可能被截断。需要显示的文字请在字幕页添加。"></textarea><details><summary>查看本次实际提交的提示词</summary><pre>{{ imageModel === 'fluxKlein/klein4bit' && !panelGenerationIssue(panel) ? identityPanelInput(episode, panel).prompt : imagePrompt(episode, panel, imageModel !== 'zImage/turbo4bit' || zImageReferenceMode === 'reference', imageModel === 'zImage/turbo4bit' && zImageReferenceMode === 'reference', '', imageModel === 'zImage/turbo4bit') }}</pre></details></details>
                    <p class="helperText">绑定角色：{{ episode.castSnapshot.filter((item) => panel.characters.includes(item.id)).map((item) => scriptRoleNames(episode!).has(item.id) ? `${scriptRoleNames(episode!).get(item.id)} → ${item.name}` : item.name).join('、') || '环境画面' }} · 表情动作在“分镜设计”调整</p><p v-if="panelGenerationIssue(panel)" class="warningText" role="status">{{ panelGenerationIssue(panel) }}</p>
                    <div v-if="panel.candidate" class="candidateNotice"><strong>新版已保存，等待选择</strong><p>当前仍使用旧版；两版都保留在历史中。</p><button class="primaryButton" @click="openPanelComparison(panel)">对比并选择版本</button></div>
                    <span v-if="panel.image && panel.generationFingerprint !== imageInput(episode, panel)" class="warningText">
                      设定已变化，请重画或明确确认沿用此图。
                    </span>

                    <details v-if="panel.history.length"><summary>历史版本与对比</summary><div class="versionSelect">
                      <label :for="`version${index}`">图片版本</label>
                      <select :id="`version${index}`" :value="panel.image" @change="switchImage($event, panel)">
                        <option v-for="(path, version) in panel.history" :key="path" :value="path">版本 {{ version + 1 }}</option>
                      </select>
                      <button v-if="panel.history.length > 1" class="secondaryButton" @click="openPanelComparison(panel)">对比历史版本</button>
                    </div></details>
                    <button
                      v-if="panel.image && panel.generationFingerprint !== imageInput(episode, panel)"
                      class="textButton"
                      @click="
                        panel.generationFingerprint = imageInput(episode, panel);
                        panel.approvalFingerprint = '';
                      ">
                      确认沿用当前图片
                    </button>
                  </div>
                </article>
              </div>
              </div>
              </template>
            </section>

            <section v-else-if="stage === 5 && episode" class="layoutStage">
              <header class="productionHeader"><div><h2>{{ episode.title }}</h2><p>分格制作 · 拼页与气泡</p></div><button class="secondaryButton" @click="stage = 6">预览与导出 →</button></header>
              <div class="productionSteps"><button class="textButton" @click="drawingPanel = letteringPanel; stage = 4">← 1 绘制画面</button><strong>2 拼页与气泡</strong><span>选画格，再点击画面上的气泡编辑。</span></div>
              <details class="surface layoutControls"><summary>页面设置 · {{ episode.layout.perPage }} 格 / 页 · 字体、排版与底色</summary>
                <div class="layoutControlGrid">
                  <div><label for="perPage">每页格数</label><select id="perPage" v-model="episode.layout.perPage"><option :value="1">1 格 / 页</option><option :value="2">2 格 / 页</option><option :value="4">4 格 / 页</option></select></div>
                  <div><label for="pageArrangement">拼页方式</label><select id="pageArrangement" :value="episode.layout.arrangement || 'grid'" @change="episode.layout.arrangement = ($event.target as HTMLSelectElement).value as 'grid' | 'vertical' | 'horizontal'"><option value="grid">标准分格</option><option value="vertical">上下排列</option><option value="horizontal">左右排列</option></select></div><div><label for="pageGutter">画格间距 {{ episode.layout.gutter ?? 24 }} px</label><input id="pageGutter" :value="episode.layout.gutter ?? 24" @input="episode.layout.gutter = Number(($event.target as HTMLInputElement).value)" type="range" min="8" max="60" /></div>
                  <div><label for="comicFont">成品字体</label><select id="comicFont" v-model="episode.layout.fontFamily"><option value="sans">清晰黑体 · 系统</option><option value="wenkai">霞鹜文楷 · 内置</option><option value="serif">中文宋体 · 系统</option><option value="genkiGothic">源起黑体 · 内置</option><option value="huninn">粉圆 · 内置</option><option value="genkiMin">源起明体 · 内置</option></select></div>
                  <div><label for="textMode">文字位置</label><select id="textMode" v-model="episode.layout.textMode"><option value="overlay">漫画气泡 · 拖动定位</option><option value="safe">画外留白 · 不遮人物</option></select></div>
                </div><details><summary>页面细节 · 字号、底色与质感</summary><div class="layoutControlGrid">                  <div><label for="fontSize">文字字号：{{ episode.layout.fontSize }} px</label><input id="fontSize" v-model.number="episode.layout.fontSize" type="range" min="20" max="60" /></div>
                  <div><label for="pageBackground">页面底色</label><input id="pageBackground" v-model="episode.layout.background" type="color" /></div>
                  <div class="flavorToggle"><label for="comicFlavor"><input id="comicFlavor" v-model="episode.layout.comicFlavor" type="checkbox" /> 漫画质感 · 网点、拟声词、页码</label></div></div></details>
                <p class="helperText">输出 1080 × 1440 PNG。文字独立排版，修改对白无需重新出图。</p>
                <button class="primaryButton" @click="run('生成排版预览', preview)">
                  <icon-layout :size="16" />
                  刷新排版预览
                </button>
              </details>
              <div class="layoutWorkspace">
                <div class="letteringTabs" aria-label="选择要排字的分格"><button v-for="(panel, index) in episode.panels" :key="panel.id" :class="{ selected: letteringPanel === index }" @click="letteringPanel = index">第 {{ index + 1 }} 格</button></div>
                <div class="letteringRows">
                  <article v-for="(panel, index) in episode.panels" v-show="letteringPanel === index" :key="panel.id" class="surface">
                    <h3>第 {{ index + 1 }} 格 · 文字与位置</h3><details><summary>画格顺序、旁白与音效</summary><div class="panelActions"><button class="secondaryButton" :disabled="index === 0" @click="movePanel(index, -1); letteringPanel = index - 1">前移一格</button><button class="secondaryButton" :disabled="index === episode.panels.length - 1" @click="movePanel(index, 1); letteringPanel = index + 1">后移一格</button></div>
                    <label :for="`letterCaption${index}`">画外旁白</label><textarea :id="`letterCaption${index}`" v-model="panel.caption" rows="2" maxlength="300" /><label :for="`letterSfx${index}`">音效字</label><input :id="`letterSfx${index}`" v-model="panel.sfx" maxlength="40" /></details>
                    <letteringEditor :panel="panel" :cast="episode.castSnapshot" :imageUrl="imageUrls[panel.image]" :textMode="episode.layout.textMode" :fontFamily="episode.layout.fontFamily" />
                  </article>
                </div>
                <details class="pagePreviewColumn"><summary>查看拼页成品预览</summary><p class="helperText">完整分格与字体已合成，点击图片查看大图。</p><p v-if="previewMessage" class="previewWarning" role="alert">{{ previewMessage }}</p><p v-else-if="!previewUrls.length" class="helperText">缺图以占位图显示，修改字号、气泡和排版会实时刷新。</p><div class="pagePreviews"><img v-for="(url, index) in previewUrls" :key="url" :src="url" :alt="`第 ${index + 1} 页排版预览`" tabindex="0" role="button" @click="largePreviewVisible = true" @keydown.enter="largePreviewVisible = true" /></div></details>
              </div>
            </section>

            <section v-else-if="stage === 6 && episode">
              <div class="surface"><h2>整体效果预览</h2><p>检查角色、对白与排版；需要时返回微调，无需逐格审批。导出的是当前采用的图片。</p><div class="panelActions"><button class="secondaryButton" @click="run('刷新预览', preview)">刷新预览</button><button class="secondaryButton" @click="stage = 4">修改画面</button><button class="secondaryButton" @click="stage = episode.productionMode === 'direct' ? 4 : 5">{{ episode.productionMode === 'direct' ? '修改台词并重绘' : '调整气泡与文字' }}</button><button class="primaryButton" :disabled="!productionReady(episode)" @click="run('导出图片', exportImages)">导出成品图片</button></div><p v-if="episode.productionMode === 'panels' && episode.panels.some((panel) => !panel.image)" class="helperText">还有 {{ episode.panels.filter((panel) => !panel.image).length }} 格未配图，预览中以占位图显示，字幕正常合成；补齐后即可导出。</p><p v-if="previewMessage" role="status">{{ previewMessage }}</p></div>

              <div class="pagePreviews"><img v-for="(url, index) in previewUrls" :key="url" :src="url" :alt="`第 ${index + 1} 页成品预览`" tabindex="0" role="button" @click="largePreviewVisible = true" @keydown.enter="largePreviewVisible = true" /></div>
            </section>

            <section v-else-if="stage === 7 && episode" class="splitColumns">
              <div class="surface">
                <h2>发布文案</h2>
                <div class="postToolbar"><label for="postStyle">文案风格</label><select id="postStyle" v-model="episode.postStyle"><option v-for="tone in ['简单有梗', 'emo', '误会有梗', '温柔治愈', '轻松科普']" :key="tone" :value="tone">{{ tone }}</option></select><button class="secondaryButton" @click="run('生成发布文案候选', generatePost)">生成文案候选</button></div>
                <p class="helperText">使用当前文本模型，点击才调用；候选不会覆盖正文，采用后仍可编辑。</p>
                <div v-if="episode.postCandidate" class="postCandidate"><label for="postCandidate">生成候选 · 可先修改</label><textarea id="postCandidate" v-model="episode.postCandidate" rows="7" maxlength="1200"></textarea><div class="panelActions"><button class="primaryButton" @click="run('采用发布文案', async () => { episode!.postText = episode!.postCandidate; episode!.postCandidate = ''; await save(); })">采用候选</button><button class="secondaryButton" @click="run('放弃文案候选', async () => { episode!.postCandidate = ''; await save(); })">放弃候选</button></div></div>
                <label for="postText">标题、正文与话题标签</label>
                <textarea id="postText" v-model="episode.postText" rows="13"></textarea>
                <details class="postReview"><summary>发布前自审 · 生成说明与参考来源</summary><p>这些记录默认不加入发布正文；需要时自行勾选。平台要求的 AI 标识请在发布时核对。</p><p>创作说明：本作品为原创虚构漫画，AI辅助情况请结合素材档案审核。</p><p>参考来源：{{ episode.topic.url || episode.topic.source }}{{ episode.researchPackId ? '；另有专题素材包，见创作档案。' : '' }}</p><label><input v-model="episode.includeAiDisclosure" type="checkbox" />正文加入 AI 辅助说明</label><label><input v-model="episode.includeReferences" type="checkbox" />正文加入参考来源</label></details>
                <details v-if="episode.includeAiDisclosure || episode.includeReferences" class="postReview"><summary>查看最终导出文案</summary><pre>{{ publicationText(episode) }}</pre></details>
                <label for="publishedUrl">发布后记录作品链接</label>
                <input id="publishedUrl" v-model="episode.publishedUrl" type="url" />
                <div class="panelActions">
                  <a class="secondaryButton" href="https://creator.xiaohongshu.com/" target="_blank" rel="noopener noreferrer">
                    打开小红书创作中心
                    <icon-external-link :size="15" />
                  </a>
                  <button class="secondaryButton" @click="run('保存发布记录', save)">保存发布记录</button>
                </div>
              </div>
              <div class="surface exportCard">
                <span class="exportIcon"><icon-package-export :size="36" /></span>
                <h2>导出发布包</h2>
                <p>
                  PNG 成品页 · 发布文案 · 来源记录
                  <br />
                  本期脚本、角色与风格快照
                </p>
                <dl>
                  <div>
                    <dt>画面尺寸</dt>
                    <dd>1080 × 1440</dd>
                  </div>
                  <div>
                    <dt>图片完成</dt>
                    <dd>{{ (episode.productionMode === 'direct' ? episode.directPages : episode.panels).filter((panel) => panel.image).length }} / {{ (episode.productionMode === 'direct' ? episode.directPages : episode.panels).length }} {{ episode.productionMode === 'direct' ? '页' : '格' }}</dd>
                  </div>
                  <div>
                    <dt>美术版本</dt>
                    <dd>{{ episode.styleSnapshot?.name || "尚未绑定" }}</dd>
                  </div>
                </dl>
                <button
                  class="primaryButton"
                  :disabled="!productionReady(episode)"
                  @click="run('排版并导出发布包', exportPackage)">
                  <icon-download :size="17" />
                  导出 ZIP 发布包
                </button>
                <p class="helperText">素材包会下载并保存在项目目录。请在平台完成发布与 AI 内容声明；软件不会自动发帖。</p>
              </div>
            </section>

            <section v-else class="stageNotice">
              <icon-file-description :size="32" />
              <h2>先为本期选一个话题</h2>
              <p>从资讯候选或你提供的来源创建作品，再继续制作。</p>
              <button class="primaryButton" @click="stage = 0">前往热点与来源</button>
            </section>
          </fieldset>

          <footer v-if="![0, 1, 2, 3, 4, 5].includes(stage)" class="stageFooter">
            <button class="textButton" :disabled="stage === 0 || !!busy" @click="stage = stage === 6 || stage === 5 ? 4 : stage - 1">
              <icon-arrow-left :size="16" />
              上一步
            </button>
            <span>{{ stage >= 5 ? stage : stage + 1 }} / {{ stages.length - 1 }}</span>
            <button class="primaryButton" :disabled="stage === stages.length - 1 || !!busy || !episode" @click="stage = stage === 4 || stage === 5 ? 6 : stage + 1">
              {{ !episode ? (ideaMode === 'ownStory' ? '先保存自己的剧情' : '从剧情、原创灵感或热点开始') : stage === stages.length - 1 ? '已到最后一步' : `继续：${stages[stage === 4 || stage === 5 ? 6 : stage + 1]!.title}` }}
              <icon-arrow-right :size="16" />
            </button>
          </footer>
        </template>
      </main>
    </div>

    <el-dialog v-model="spaceManageVisible" class="platformDialog" title="管理创作空间" width="min(540px, 94vw)" alignCenter><div v-if="project"><label for="spaceName">当前空间名称</label><input id="spaceName" v-model="spaceName" class="dialogInput" maxlength="100" /><div class="panelActions"><button class="primaryButton" :disabled="!!busy || saving || !spaceName.trim()" @click="run('修改空间名称', () => renameSpace(spaceName))">保存名称</button><button class="secondaryButton" :disabled="!!busy || saving" @click="run('删除空间', deleteSpace)">删除当前空间 · 可恢复</button></div></div><h3>已删除空间 · {{ archivedProjects.length }}</h3><p>仅移出列表，作品和图片仍在本机。恢复后可以继续创作。</p><div v-for="item in archivedProjects" :key="item.directory" class="panelActions"><span>{{ item.name }}</span><button class="secondaryButton" :disabled="!!busy || saving" @click="run('恢复空间', async () => { await restoreSpace(item.directory); spaceName = project?.title || ''; })">恢复空间</button></div></el-dialog>
    <el-dialog v-model="newProjectVisible" class="platformDialog" title="新建漫画项目" width="min(460px, 92vw)" alignCenter>
      <label for="newProjectTitle">项目名称</label>
      <input id="newProjectTitle" v-model="newProjectTitle" class="dialogInput" maxlength="100" @keyup.enter="createNamedProject" />
      <template #footer>
        <button class="secondaryButton" @click="newProjectVisible = false">取消</button>
        <button class="primaryButton" :disabled="!!busy || !newProjectTitle.trim()" @click="createNamedProject">创建项目</button>
      </template>
    </el-dialog>
    <el-dialog v-model="topicVisible" class="platformDialog" title="添加话题与来源" width="min(560px, 92vw)" alignCenter>
      <div class="dialogForm">
        <label for="topicTitle">话题标题</label>
        <input id="topicTitle" v-model="topicDraft.title" maxlength="1000" />
        <label class="checkLabel"><input v-model="topicDraft.original" type="checkbox" />这是原创虚构故事（不要求新闻链接）</label>
        <label v-if="!topicDraft.original" for="topicUrl">原始来源链接</label>
        <input v-if="!topicDraft.original" id="topicUrl" v-model="topicDraft.url" type="url" />
        <label for="topicSummary">事实摘要</label>
        <textarea id="topicSummary" v-model="topicDraft.summary" rows="5"></textarea>
      </div>
      <template #footer>
        <button class="secondaryButton" @click="topicVisible = false">取消</button>
        <button class="primaryButton" :disabled="!topicDraft.title.trim() || (!topicDraft.original && !safeLink(topicDraft.url)) || !!busy" @click="addTopic">保存话题</button>
      </template>
    </el-dialog>
    <el-dialog v-model="largePreviewVisible" class="platformDialog" title="小冷漫画 · 成品大图" width="min(900px, 94vw)" alignCenter><img v-for="(url, index) in previewUrls" :key="url" :src="url" :alt="`完整成品第 ${index + 1} 页`" style="width: 100%; height: auto; display: block; margin-bottom: 16px" /></el-dialog>
    <el-dialog v-model="comparisonVisible" class="platformDialog" title="重画对比 · 两版都会保留" width="min(1000px, 94vw)" alignCenter><template v-if="comparisonPanel"><p>检查动作由谁执行、角色数量、服装与道具。采用版本后需重新审稿；这里不会再次调用模型。</p><div class="imageComparison"><figure v-for="side in ['left', 'right'] as const" :key="side"><label :for="`comparison${side}`">{{ side === 'left' ? '左侧版本' : '右侧版本' }}</label><select :id="`comparison${side}`" :value="side === 'left' ? comparisonLeft : comparisonRight" @change="side === 'left' ? comparisonLeft = ($event.target as HTMLSelectElement).value : comparisonRight = ($event.target as HTMLSelectElement).value"><option v-for="(path, version) in comparisonPanel.history" :key="path" :value="path">版本 {{ version + 1 }}{{ comparisonPanel.image === path ? ' · 当前采用' : comparisonPanel.candidate?.path === path ? ' · 新版候选' : '' }}</option></select><img :src="imageUrls[side === 'left' ? comparisonLeft : comparisonRight]" :alt="side === 'left' ? '左侧漫画版本' : '右侧漫画版本'" /><button :disabled="!!busy || saving" class="primaryButton" @click="run('选择漫画版本', () => useComparedVersion(side === 'left' ? comparisonLeft : comparisonRight))">采用{{ side === 'left' ? '左侧' : '右侧' }}版本</button></figure></div><button v-if="comparisonPanel.candidate" :disabled="!!busy || saving" class="secondaryButton" @click="run('保留旧版', async () => { await resolveCandidate(comparisonPanel!, false); comparisonVisible = false; })">保留当前旧版</button></template></el-dialog>
    <settings v-model="settingsVisible" v-model:panel="settingsPanel" :comicStudio="true">
      <template #comicOverview><settingsOverview :textMode="textMode" :textLabel="textModels.find((item) => `${item.providerId}/${item.modelId}` === textModel)?.label || ''" :imageLabel="imageModels.find((item) => `${item.providerId}/${item.modelId}` === imageModel)?.label || ''" :codexModel="codexModel" :automatic="collectionSettings.automatic" :intervalMinutes="collectionSettings.intervalMinutes" @navigate="settingsPanel = $event" /></template>
      <template #comicDefaults><div class="comicSettings"><div class="settingsLead"><h3>为漫画任务分配模型</h3><p>先在「文本模型 / 生图模型」配置供应商，再在这里选择默认服务。文本与生图互不覆盖；更改自动保存。</p></div><div class="settingColumns"><section class="settingCard"><h3>文本任务</h3><p>选梗、故事脚本、分镜结构、反馈复盘。</p><label for="studioTextMode">运行方式</label><select id="studioTextMode" v-model="textMode" :disabled="modelChecking"><option value="codex">本机 Codex CLI</option><option value="api">云端 / 本地文本 API</option></select><template v-if="textMode === 'codex'"><label for="studioCodexModel">Codex 模型 ID</label><input id="studioCodexModel" v-model="codexModel" :disabled="modelChecking" maxlength="101" /><label for="textEffort">编剧推理强度</label><select id="textEffort" v-model="textEffort"><option value="low">快速</option><option value="medium">均衡</option><option value="high">细致</option><option value="xhigh">深入 · 耗时较长</option></select><p>在本机启动 Codex CLI，通过网络调用模型，并非离线模型。复用 CLI 登录，不修改全局配置。</p></template><template v-else><label for="defaultTextModel">默认文本模型</label><select id="defaultTextModel" v-model="textModel" :disabled="modelChecking"><option value="">请先添加文本模型</option><option v-for="model in textModels" :key="`${model.providerId}/${model.modelId}`" :value="`${model.providerId}/${model.modelId}`">{{ model.label }}</option></select></template><button :disabled="modelChecking || (textMode === 'api' && !textModel)" @click="probeTextModel">{{ modelChecking ? '正在真实调用…' : '测试文本生成' }}</button><p class="modelProbeResult" role="status">{{ modelProbeMessage || '检测会发起一次简短请求，可能产生少量模型费用。' }}</p><button @click="openSettings('languageModel')">管理文本模型</button><button @click="openSettings('comicLocal')">连接本地文本服务</button></section><section class="settingCard"><h3>生图任务</h3><p>角色设定、画风样张、连续分格出图。</p><label for="studioImageModel">默认生图模型</label><select id="studioImageModel" v-model="imageModel"><option value="">尚未选择生图服务</option><option v-for="model in imageModels.filter((item) => item.configured || `${item.providerId}/${item.modelId}` === imageModel)" :key="`${model.providerId}/${model.modelId}`" :value="`${model.providerId}/${model.modelId}`" :disabled="!model.configured">{{ model.label }}</option></select><p>{{ imageModel === 'fluxKlein/klein4bit' ? '本机多参考编辑，4步；每格读取正式角色图，最多4位角色。请先用草稿验证身份与场景，无云端API费用。' : imageModel === 'zImage/turbo4bit' ? '本机 MLX 推理，默认768×1024、9步；在分格出图可选画质。无云端API费用。支持单参考图，不支持多角色锁定。' : imageModel === 'codex/imagegen' ? '通过已登录的 Codex CLI 直接生图，自动保存回作品。需联网并使用当前账号额度，不需要另填图片 API 密钥。' : imageModel ? '模型已选择；请在分格出图点击生成，验证实际效果。' : '可使用已登录且支持生图的 Codex CLI，或添加图片 API、本地 ComfyUI 工作流。' }}</p><button @click="openSettings('mediaModel')">管理生图模型与工作流</button><button @click="openSettings('comicLocal')">检测本地生图服务</button></section></div><section class="settingCard"><h3>界面与阅读</h3><p>主题、强调色和界面字号统一由原有「界面设置」管理。漫画成品的字号与排字仍在制作流程中设置。</p><button @click="openSettings('ui')">打开界面设置</button></section></div></template>
      <template #comicPlatforms>      <div class="connectionContent">
        <p>按平台连接一次，之后回到选题页使用。你不需要手工查找或粘贴 Cookie。</p>
        <platformAccounts :disabled="!!busy || saving" @collected="(items) => run('收集本人浏览器内容', async () => { if (!project) throw new Error('请先选择创作空间'); const topics = projectSchema.shape.topics.parse(items.map((item) => ({ ...(item as object), id: newTopicId(), verified: false }))); project.topics = [...topics, ...project.topics.filter((old) => !topics.some((item) => old.url === item.url))].slice(0, 1000); await save(); settingsVisible = false; stage = 0; workspaceMode = 'studio'; })" />
        <section class="connectionCard">
          <div class="connectionTitle"><h3>小红书</h3><span class="connectionStatus">{{ xhsConnected ? '本人账号已连接' : loginImage ? '等待手机确认' : loginBusy ? '正在检查…' : xhsAvailable ? '服务就绪 · 待扫码' : '尚未连接' }}</span></div>
          <ol v-if="!loginImage && !xhsConnected"><li>手机上登录你自己的小红书 App；没有账号请先在 App 内注册。</li><li>点击下方连接，软件会启动本机搜索服务并显示二维码。</li><li>用 App 扫码并确认；页面自动更新后即可按关键词找高赞笔记。</li></ol>
          <button v-if="!xhsConnected && !loginImage" class="connectionButton" :disabled="loginBusy" @click="connectXhs">{{ loginBusy ? '正在准备…' : '连接小红书' }}</button>
          <button v-if="xhsConnected" class="connectionButton" @click="source = 'xhsLocal'; stage = 0; settingsVisible = false; workspaceMode = 'studio'">开始搜索小红书</button>
          <button class="connectionSecondary" :disabled="loginBusy" @click="checkXhsLogin">检查连接</button>
          <p role="status">{{ loginMessage }}</p>
          <figure v-if="loginImage" class="loginQr"><img :src="loginImage" alt="使用本人小红书 App 扫码，并在手机确认登录" /><figcaption>剩余 {{ loginSeconds }} 秒 · 手机确认后自动更新</figcaption></figure>
          <p class="connectionNote">使用已安装的第三方开源 xiaohongshu-mcp 连接本人会话，不代表平台官方 API 授权。登录状态保存在本机；当前支持登录、搜索和标准笔记链接的公开互动数；不包含后台阅读量。</p>
          <details><summary>连接失败或本机尚未安装？</summary><p>本机已安装时可直接点击连接。缺少服务请参考项目使用指南，或访问 <a href="https://github.com/xpzouying/xiaohongshu-mcp" target="_blank" rel="noopener noreferrer">开源服务安装说明</a>。若平台要求验证，请在手机端本人完成后再检查连接。</p></details>
        </section>
        <p class="helperText">B站公开视频播放、点赞等指标可在「数据分析 → 作品表现」登记BV链接后同步，无需登录。</p>
      </div>
</template>
      <template #comicLocal><localRuntime @imageConnected="(model) => run('选择本地生图', async () => { await loadModels(); imageModel = model; settingsPanel = 'comicDefaults'; })" @connected="(model) => run('接入本地文本模型', async () => { await loadModels(); textMode = 'api'; textModel = model; settingsPanel = 'comicDefaults'; })" @images="settingsPanel = 'mediaModel'" /></template>
      <template #comicCollection><div class="comicSettings"><h3>自动采集与同步</h3><p>数据分析页保持打开且处于前台时按间隔运行；离开分析页、切到后台或关闭软件后暂停。公开热点不需要账号；作品数据按登记链接和平台权限读取。</p><label><input v-model="collectionSettings.automatic" type="checkbox" />进入数据分析时自动刷新，并按间隔继续采集</label><label for="collectionInterval">刷新间隔</label><select id="collectionInterval" v-model.number="collectionSettings.intervalMinutes"><option :value="15">15 分钟</option><option :value="30">30 分钟</option><option :value="60">60 分钟</option></select><p>采集范围：抖音公开热榜、B站公开热词，以及已启用的作品链接。小红书作品互动数依赖本人会话；阅读量当前不可获取。采集失败保留旧数据并显示最后成功时间。</p><button class="connectionButton" :disabled="!project || !!busy" @click="run('采集热点与作品数据', () => collectAnalysis())">立即采集一次</button><p role="status">{{ analysisStatus }}</p></div></template>
    </settings>
  </div>
</template>

<script setup lang="ts">
import directPageEditor from "./directPageEditor.vue";
import { productionReady, directPageInput, bindStoryName } from "./model";
import { computed, onMounted, onBeforeUnmount, ref, reactive, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import {
  IconSearch,
  IconPencil,
  IconLayoutBoard,
  IconTypography,
  IconChecklist,
  IconTrendingUp,
  IconChartBar,
  IconHeart,
  IconHistory,
  IconBookmarks,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconChevronRight,
  IconPlus,
  IconCheck,
  IconAdjustments,
  IconLayoutDashboard,
  IconDeviceFloppy,
  IconRefresh,
  IconLink,
  IconArrowUpRight,
  IconArrowRight,
  IconExternalLink,
  IconSparkles,
  IconArrowUp,
  IconArrowDown,
  IconPhotoPlus,
  IconStack2,
  IconUserSquareRounded,
  IconPackageExport,
  IconPhoto,
  IconLayout,
  IconDownload,
  IconFileDescription,
  IconArrowLeft,
} from "@tabler/icons-vue";
import settings from "@/components/settings/index.vue";
import useStudio from "./useStudio";
import letteringEditor from "./letteringEditor.vue";
import analysisDashboard from "./analysisDashboard.vue";
import settingsOverview from "./settingsOverview.vue";
import { uiSettings } from "@/stores/settings";
import localRuntime from "./localRuntime.vue";
import platformAccounts from "./platformAccounts.vue";
import researchDesk from "./researchDesk.vue";
import seriesDesk from "./seriesDesk.vue";
import personalHub from "./personalHub.vue";
import artLibrary from "./artLibrary.vue";
import useWorkspaceFiles from "@/lib/workspaceFiles";
import { imageInput, imagePrompt, identityPanelInput, referenceReady, characterSchema, scriptRoleNames, characterVisual, characterPrompt, reviewInput, isApproved, newPanel, safeLink, splitDialogue, projectSchema, publicationText } from "./model";
import type { Panel, Character, ArtStyle } from "./model";

const newTopicId = () => crypto.randomUUID();
const researchKeyword = ref("");
const ideaMode = ref("hot");
const searchAcross = ref(true);
function searchInspirations() {
  if (busy.value) return;
  if (searchAcross.value && searchKeyword.value.trim()) return run("跨平台查找灵感", discoverAcrossPlatforms);
  if (source.value === "xhsLocal" && !xhsConnected.value) { connectionsVisible.value = true; return; }
  return run("收集灵感", () => ["douyin", "bilibili", "xhsLocal"].includes(source.value) ? discoverMemes() : refreshTopics());
}
async function researchTopic(keyword: string) { researchKeyword.value = keyword.slice(0, 80); ideaMode.value = "research"; await nextTick(); }
const route = useRoute();
const router = useRouter();
const workspaceMode = computed({ get: () => ["analysis", "archive"].includes(String(route.query.workspace)) ? String(route.query.workspace) : "studio", set: (value: string) => { void router.replace({ query: { ...route.query, workspace: value } }); } });
const analysisView = computed({ get: () => route.query.panel === "works" ? "works" : "market", set: (value: string) => { void router.replace({ query: { ...route.query, panel: value } }); } });
const archiveTabs = [{ id: "overview", label: "创作偏好", icon: IconHeart }, { id: "journal", label: "修改记录", icon: IconHistory }, { id: "assets", label: "素材库", icon: IconBookmarks }];
const archiveView = computed({ get: () => archiveTabs.some((item) => item.id === route.query.panel) ? String(route.query.panel) : "overview", set: (value: string) => { void router.replace({ query: { ...route.query, panel: value } }); } });
function navigateSection(workspace: string, panel: string) {
  void router.replace({ query: { ...route.query, workspace, panel } });
}
const sidebarCollapsed = ref(false);
const expandedSections = reactive(new Set([workspaceMode.value]));
function toggleSection(section: string) {
  if (sidebarCollapsed.value) { sidebarCollapsed.value = false; expandedSections.add(section); return; }
  if (expandedSections.has(section)) expandedSections.delete(section); else expandedSections.add(section);
}
watch(workspaceMode, (value) => expandedSections.add(value));
const originalDirection = ref("");
const originalStory = ref("");
const spaceManageVisible = ref(false);
const spaceName = ref("");
const originalCastMode = ref<"new" | "fixed">("new");
const originalCharacterIds = ref<string[]>([]);
watch(originalCastMode, (mode) => { if (mode === "fixed" && !originalCharacterIds.value.length) originalCharacterIds.value = project.value?.characters.map((item) => item.id) || []; });
const {
  requestImage,
  collectionSettings,
  analysisStatus,
  collectAnalysis,
  syncPublication,
  changeReason,
  startOriginal,
  startFromStory,
  archivedProjects,
  renameSpace,
  archiveSpace,
  restoreSpace,
  startNextEpisode,
  useResearchPack,
  collectResearch,
  readResearchSource,
  researchStatus,
  generateStylePreview,
  analyzeFeedback,
  workspace,
  directory,
  files,
  project,
  stage,
  busy,
  lastError,
  textEffort,
  saving,
  dirty,
  episode,
  activeStyle,
  imageUrls,
  previewUrls,
  previewMessage,
  studioTheme,
  studioAccent,
  studioDensity,
  generateCharacter,
  analyzeReferences,
  referenceAnalysisMode,
  exportCharacter,
  textModels,
  imageModels,
  textModel,
  imageModel,
  zImageQuality,
  zImageReferenceMode,
  generationProgress,
  resolveCandidate,
  textMode,
  codexModel,
  source,
  topicCategory,
  topicKeyword,
  searchKeyword,
  visibleTopics,
  loginImage,
  loginMessage,
  sourceMessage,
  connectionsVisible,
  loginBusy,
  xhsConnected,
  xhsAvailable,
  loginSeconds,
  checkXhsLogin,
  connectXhs,
  fetchedAt,
  approvedCount,
  run,
  save,
  openProject,
  createProject,
  loadModels,
  discoverProjects,
  refreshTopics,
  discoverMemes,
  discoverAcrossPlatforms,
  selectMeme,
  selectTopic,
  putImage,
  generateStory,
  generatePost,
  bindSettings,
  publishStyle,
  adoptImage,
  panelGenerationIssue,
  generatePanel,
  generateDirectPage,
  generateDirectPages,
  stopDirectBatch,
  resolveDirectPage,
  generateMissingPanels,
  exportCodexTask,
  preview,
  exportPackage,
  exportImages,
  analyzeLibrary,
  ensureImage,
} = useStudio();
const comparisonVisible = ref(false);
const comparisonPanel = ref<Panel | null>(null);
const comparisonLeft = ref("");
const comparisonRight = ref("");
function openPanelComparison(panel: Panel) {
  comparisonPanel.value = panel;
  comparisonLeft.value = panel.image || panel.history[0] || "";
  comparisonRight.value = panel.candidate?.path || [...panel.history].reverse().find((path) => path !== comparisonLeft.value) || comparisonLeft.value;
  comparisonVisible.value = true;
}
async function useComparedVersion(path: string) {
  const panel = comparisonPanel.value;
  if (!panel || !episode.value || !panel.history.includes(path)) return;
  if (panel.candidate?.path === path) await resolveCandidate(panel, true);
  else {
    panel.image = path;
    panel.generationFingerprint = imageInput(episode.value, panel);
    panel.approvalFingerprint = "";
    panel.candidate = null;
    await save();
  }
  comparisonVisible.value = false;
}
watch([directory, () => episode.value?.id], () => { comparisonVisible.value = false; comparisonPanel.value = null; });
const modelChecking = ref(false);
const modelProbeMessage = ref("");
watch([textMode, textModel, codexModel], () => { modelProbeMessage.value = ""; });
async function probeTextModel() {
  modelChecking.value = true;
  modelProbeMessage.value = "正在检测真实生成能力，最多等待一分钟…";
  const modelSelection = textModel.value.indexOf("/");
  try {
    const { data } = await axios.post("/api/comicStudio/modelProbe", {
      mode: textMode.value,
      codexModel: codexModel.value || undefined,
      providerId: textModel.value.slice(0, modelSelection),
      modelId: textModel.value.slice(modelSelection + 1),
    }, { headers: { "x-toonflow-workspace": "1" }, timeout: 65000 });
    modelProbeMessage.value = `生成成功 · ${(data.data.elapsedMs / 1000).toFixed(1)} 秒 · ${data.data.message}`;
  } catch (error) {
    modelProbeMessage.value = axios.isAxiosError(error)
      ? error.response?.data?.message || "连接超时或服务不可达，请检查网络和服务地址。"
      : "检测未完成，请重试。";
  } finally { modelChecking.value = false; }
}
const productionIssue = computed(() => !episode.value?.styleSnapshot ? "请先选择本篇画风" : !imageModels.value.some(item => `${item.providerId}/${item.modelId}` === imageModel.value && item.configured) ? "请先配置图片服务" : "");
const scriptIssue = ref("");
const scriptSourceOpen = ref(false);
const isOriginalEpisode = computed(() => ["原创灵感", "专题原创", "原创连载", "原创故事"].includes(episode.value?.topic.source || ""));
const hasOnlyTopicClue = computed(() => episode.value?.topic.kind === "hotSearch" || /热搜线索|不是事实原文|标题与来源/.test(episode.value?.topic.summary || ""));
watch(() => episode.value?.id, () => { scriptIssue.value = ""; scriptSourceOpen.value = false; });
function requestStory() {
  scriptIssue.value = "";
  if (!episode.value?.topic.verified) {
    scriptIssue.value = "请先选择「借这个关键词写原创」，或补充来源内容并确认核对。";
    return;
  }
  if (textMode.value === "api" && !textModel.value) {
    scriptIssue.value = "尚未选择可用的文本模型，请完成模型配置后重试。";
    openSettings("comicDefaults");
    return;
  }
  void run("生成脚本与分镜，请稍候…", generateStory);
}
function useTopicAsInspiration() {
  void run("将热词用作原创灵感", async () => {
    if (!episode.value) return;
    const topic = episode.value.topic;
    topic.summary = `只借用关键词「${topic.title}」创作原创虚构剧情，不代表来源中的真实事件或原视频内容。\n原始线索平台：${topic.source}\n${topic.summary}`.slice(0, 20000);
    topic.source = "原创灵感";
    topic.verified = true;
    episode.value.direction = `创作4–6格原创生活漫画，有铺垫、冲突和反转。只借关键词「${topic.title}」作为灵感，不把未读取的原文当事实；不使用真实人物身份复述或虚构事件。`;
    scriptIssue.value = "";
    await save();
  });
}
const studioContent = ref<HTMLElement>();
watch([stage, workspaceMode, analysisView, archiveView, ideaMode], () => { window.scrollTo({ top: 0, behavior: "instant" }); studioContent.value?.scrollTo({ top: 0, behavior: "instant" }); }, { flush: "post" });
const stages = [
  { title: "热点与来源", icon: IconSearch, eyebrow: "DISCOVER", heading: "好故事，从一个好选题开始。", description: "收集资讯、保留来源，选择值得用漫画表达的话题。" },
  { title: "选题与脚本", icon: IconPencil, eyebrow: "WRITE", heading: "让话题，成为一个故事。", description: "核对事实素材，确定表达角度，完成故事与对白。" },
  { title: "分镜设计", icon: IconLayoutBoard, eyebrow: "STORYBOARD", heading: "把故事，一格一格展开。", description: "编排镜头、动作与对白，为每个画面做好准备。" },
  { title: "角色与美术", icon: IconUserSquareRounded, eyebrow: "ART DIRECTION", heading: "每个故事，都有自己的样子。", description: "先选本篇角色与画风，再用图片或一句话创建新资源。" },
  { title: "漫画制作", icon: IconPhoto, eyebrow: "GENERATE", heading: "让分镜，变成看得见的画面。", description: "整页直出或分格制作，在同一空间绘制、排字和比较版本。" },
  { title: "字幕与排版", icon: IconTypography, eyebrow: "COMPOSE", heading: "让画面和文字，好好说话。", description: "独立编辑对白与旁白，在实际尺寸中调整排版。" },
  { title: "整体预览", icon: IconChecklist, eyebrow: "REVIEW", heading: "看看完整效果，满意就导出。", description: "预览整体排版，随时返回微调，不需要逐格审批。" },
  { title: "导出发布", icon: IconPackageExport, eyebrow: "PUBLISH", heading: "把完成的故事，交给读者。", description: "打包成品、文案与来源，前往平台发布并记录作品。" },
];
const comicProjects = computed(() => workspace.projectList.filter((item) => isComicDirectory(item.directory) || item.directory === directory.value));
const newProjectVisible = ref(false);
const newProjectTitle = ref("");
const topicVisible = ref(false);
const topicDraft = reactive({ title: "", url: "", summary: "", original: false });
const settingsVisible = ref(false);
const settingsPanel = ref("comicOverview");
function openSettings(panel = "comicOverview") { settingsPanel.value = panel; settingsVisible.value = true; }
watch(connectionsVisible, (visible) => { if (visible) openSettings("comicPlatforms"); });
watch([settingsVisible, settingsPanel], ([visible, panel]) => { connectionsVisible.value = visible && panel === "comicPlatforms"; });
let collectionTimer: ReturnType<typeof setInterval> | undefined;
function maybeCollect() {
  if (workspaceMode.value !== "analysis" || !collectionSettings.automatic || !project.value || busy.value || saving.value || document.visibilityState !== "visible") return;
  const latest = project.value.marketSnapshots.at(-1)?.at;
  if (latest && Date.now() - Date.parse(latest) < collectionSettings.intervalMinutes * 60000) return;
  void run("自动采集热点与作品数据", () => collectAnalysis(true));
}
watch([workspaceMode, () => project.value?.title], maybeCollect);
onMounted(() => { collectionTimer = setInterval(maybeCollect, 60000); });
onBeforeUnmount(() => clearInterval(collectionTimer));
const letteringPanel = ref(0);
const storyboardPanelId = ref("");
watch(() => episode.value?.panels.map(panel => panel.id).join(","), () => {
  if (!episode.value?.panels.some(panel => panel.id === storyboardPanelId.value)) storyboardPanelId.value = episode.value?.panels[0]?.id || "";
}, { immediate: true });
function addStoryboardPanel() {
  if (!episode.value) return;
  const panel = newPanel();
  episode.value.panels.push(panel);
  storyboardPanelId.value = panel.id;
}
function addStoryboardSpeech(panel: Panel) {
  if (!panel.speech.length && panel.dialogue.trim()) panel.speech = splitDialogue(panel, episode.value?.castSnapshot || []);
  if (panel.speech.length >= 6) return;
  panel.speech.push({ id: crypto.randomUUID(), speakerId: panel.characters[0] || "", text: "", kind: "dialogue", shape: "oval", tone: "light", x: .04, y: .04, width: .45, tail: "left" });
}
function removeStoryboardSpeech(panel: Panel, index: number) {
  panel.speech.splice(index, 1);
  panel.dialogue = panel.speech.filter(line => line.kind === "dialogue").map(line => {
    const name = episode.value?.castSnapshot.find(person => person.id === line.speakerId)?.name;
    return name ? `${name}：${line.text}` : line.text;
  }).join("\n");
}
const drawingPanel = ref(0);
watch(() => episode.value?.id, () => { drawingPanel.value = 0; });
watch([stage, () => episode.value?.productionMode], () => { if (stage.value === 5 && episode.value?.productionMode === "direct") stage.value = 4; });
const largePreviewVisible = ref(false);
watch(() => episode.value?.id, () => { letteringPanel.value = 0; });
const studioColors = computed(() => ({ "--studioAccent": uiSettings.value.primaryColor, fontSize: `${14 * uiSettings.value.fontScale / 100}px` }));
const artTab = ref<"characters" | "styles">("characters");

function isComicDirectory(path: string) {
  return /^comic[a-f0-9]{32}$/.test(path.split(/[\\/]/).at(-1) ?? "");
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function stageComplete(index: number) {
  if (index === 0) return Boolean(project.value?.topics.length);
  if (!episode.value) return false;
  const current = episode.value;
  return [
    true,
    Boolean(current.story),
    current.panels.length > 0,
    Boolean(current.styleSnapshot),
    productionReady(current),
    previewUrls.value.length > 0,
    previewUrls.value.length > 0,
    Boolean(safeLink(current.publishedUrl)),
  ][index];
}
function createNamedProject() {
  void run("创建本地漫画项目", async () => {
    await createProject(newProjectTitle.value);
    newProjectVisible.value = false;
    newProjectTitle.value = "";
    workspaceMode.value = "studio";
    stage.value = 0;
  });
}
function switchProject(event: Event) {
  const path = (event.target as HTMLSelectElement).value;
  if (path) void run("读取漫画项目", () => openProject(path)).then(maybeCollect);
}
function addTopic() {
  void run("保存话题来源", async () => {
    if (!project.value || (!topicDraft.original && !safeLink(topicDraft.url))) return;
    project.value.topics.unshift({
      id: crypto.randomUUID(),
      title: topicDraft.title,
      url: topicDraft.original ? "" : topicDraft.url,
      summary: topicDraft.summary || (topicDraft.original ? "原创虚构故事，不陈述新闻事实。" : ""),
      source: topicDraft.original ? "原创故事" : "手动收集",
      publishedAt: new Date().toISOString(),
      verified: topicDraft.original,
      collectedAt: new Date().toISOString(),
      metric: "",
      kind: "news",
      collectorUrl: "",
    });
    await save();
    topicVisible.value = false;
    Object.assign(topicDraft, { title: "", url: "", summary: "", original: false });
  });
}
function movePanel(index: number, offset: number) {
  const panels = episode.value?.panels;
  if (!panels || !panels[index + offset]) return;
  [panels[index], panels[index + offset]] = [panels[index + offset]!, panels[index]!];
}
async function importStory(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  await run("导入剧情文案", async () => {
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 100000) throw new Error("请选择100KB以内的TXT或Markdown文本");
    const content = await file.text();
    if (content.length > 10000 || content.includes("\u0000")) throw new Error("请使用10000字以内的UTF-8文字文件");
    originalStory.value = content.replace(/^\uFEFF/, "");
  });
}
async function reuseReference(event: Event, refs: ArtStyle["refs"], maximum = 12) {
  const input = event.target as HTMLSelectElement;
  const path = input.value;
  input.value = "";
  if (!path) return;
  await run("复用素材库图片", async () => {
    const asset = project.value?.assets.find((item) => item.path === path && !item.trashedAt);
    if (!asset || refs.some((item) => item.path === path)) return;
    if (refs.length >= maximum) throw new Error("参考图数量已达上限，请先移除不需要的参考");
    refs.push({ id: crypto.randomUUID(), path, source: asset.source, license: asset.license, note: "" });
    await ensureImage(path);
    await save();
  });
}
async function deleteSpace() {
  if (!project.value) return;
  const confirmed = await ElMessageBox.confirm(`将“${project.value.title}”移到已删除空间？作品文件保留，可恢复。`, "删除空间", { confirmButtonText: "移入已删除", cancelButtonText: "保留空间", type: "warning" }).then(() => true, () => false);
  if (!confirmed) return;
  await archiveSpace();
}
function activateUpload(event: KeyboardEvent) {
  (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]')?.click();
}
const textServiceLabel = computed(() => textMode.value === "codex" ? `Codex CLI · ${codexModel.value || "默认模型"}` : textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value)?.label || textModel.value || "尚未配置文本模型");
const analysisServiceLabel = computed(() => referenceAnalysisMode.value === "codex" ? `图片分析：Codex CLI · ${codexModel.value}` : `图片分析：${textServiceLabel.value}`);
const storySpeakers = computed(() => {
  const current = episode.value;
  if (!current) return [];
  const names = current.panels.flatMap(panel => panel.dialogue.split("\n").map(line => line.match(/^([^：:]{1,30})[：:]/)?.[1]?.trim()).filter((name): name is string => !!name));
  return [...new Set([...Object.keys(current.roleBindings), ...names])].filter(name => !Object.entries(current.roleBindings).some(([original, id]) => original !== name && current.castSnapshot.find(person => person.id === id)?.name === name));
});
function castForSpeaker(name: string) {
  if (episode.value && Object.hasOwn(episode.value.roleBindings, name)) return episode.value.roleBindings[name] || "";
  const matches = episode.value?.castSnapshot.filter((person) => [person.name, ...person.aliases.split(/[,，、;；\n]/)].some((alias) => alias.trim() === name)) || [];
  return matches.length === 1 ? matches[0]!.id : "";
}
async function assignStoryRole(name: string, id: string) {
  const current = episode.value;
  if (!current) return;
  if (!id) {
    const oldId = castForSpeaker(name);
    const oldName = current.castSnapshot.find(person => person.id === oldId)?.name;
    const restore = (text: string) => oldName ? text.split(oldName).join(name) : text;
    current.story = restore(current.story);
    for (const panel of current.panels) {
      panel.characters = panel.characters.filter(value => value !== oldId);
      panel.performances = panel.performances.filter(item => item.characterId !== oldId);
      if (panel.actionSubjectId === oldId) panel.actionSubjectId = "";
      panel.speech.forEach(line => { if (line.speakerId === oldId) line.speakerId = ""; line.text = restore(line.text); });
      for (const key of ["dialogue", "action", "shot", "caption", "imagePromptOverride", "actionInstruction"] as const) panel[key] = restore(panel[key]);
    }
    current.roleBindings[name] = "";
    await save(); return;
  }
  if (Object.entries(current.roleBindings).some(([role, bound]) => role !== name && bound === id)) throw new Error("这个人物已绑定另一位剧情角色，请选择不同人物");
  bindStoryName(current, name, id);
  await save();
}
function setStoryAliases(name: string, value: string) { const person = episode.value?.castSnapshot.find(item => item.id === castForSpeaker(name)); if (person) person.aliases = value; }
async function synchronizeCastNames() {
  if (!episode.value) return;
  for (const [name, id] of Object.entries(episode.value.roleBindings)) if (id) bindStoryName(episode.value, name, id);
  await save();
}

function syncSpeechActor(panel: Panel, index: number) {
  const speech = panel.speech[index];
  if (!speech) return;
  if (speech.speakerId && !panel.characters.includes(speech.speakerId)) panel.characters.push(speech.speakerId);
  panel.dialogue = panel.speech.filter((line) => line.kind === "dialogue").map((line) => { const name = episode.value?.castSnapshot.find((person) => person.id === line.speakerId)?.name; return name ? `${name}：${line.text}` : line.text; }).join("\n");
}
async function removeLibraryItem(kind: "characters" | "styles", id: string) {
  if (!project.value) return;
  if (kind === "styles") {
    project.value.activeStyleId = "";
    if (episode.value) episode.value.styleSnapshot = null;
  } else if (episode.value) {
    const affected = episode.value.panels.filter((panel) => panel.characters.includes(id) || panel.speech.some((line) => line.speakerId === id));
    if (affected.length && !await ElMessageBox.confirm(`此角色参与了 ${affected.length} 格。取消后保留文字和图片，清除人物绑定，可在分镜中重新指定。`, "取消本篇角色", { confirmButtonText: "取消选用", cancelButtonText: "保留角色" }).then(() => true, () => false)) return;
    episode.value.castSnapshot = episode.value.castSnapshot.filter((person) => person.id !== id);
    for (const name of Object.keys(episode.value.roleBindings)) if (episode.value.roleBindings[name] === id) episode.value.roleBindings[name] = "";
    for (const panel of episode.value.panels) {
      panel.characters = panel.characters.filter((value) => value !== id);
      panel.performances = panel.performances.filter((item) => item.characterId !== id);
      if (panel.actionSubjectId === id) panel.actionSubjectId = "";
      for (const line of panel.speech) if (line.speakerId === id) line.speakerId = "";
    }
  } else project.value.characters = project.value.characters.filter((person) => person.id !== id);
  await save();
}
async function applyLibraryItem(kind: "characters" | "styles", source: Character | ArtStyle, libraryDirectory: string) {
  if (!project.value) throw new Error("请先选择创作空间");
  const item = structuredClone(JSON.parse(JSON.stringify(source)));
  const libraryFiles = useWorkspaceFiles(libraryDirectory);
  const imagePaths = [...new Set<string>([item.image, ...(item.refs || []).map((ref: { path: string }) => ref.path), ...(item.designImages || []).map((ref: { path: string }) => ref.path)].filter(Boolean))];
  const existingPaths = new Set((await files.value.list("assets")).entries.map((entry) => `assets/${entry.name}`));
  for (const path of imagePaths) {
    if (!existingPaths.has(path)) await files.value.write(path, await libraryFiles.read(path), true);
    await ensureImage(path);
    if (!project.value.assets.some((asset) => asset.path === path)) project.value.assets.push({ path, method: "upload", source: `公共美术库 · ${item.name}`, license: "沿用素材原有授权", prompt: item.description, model: "", createdAt: new Date().toISOString() });
  }
  if (kind === "characters") {
    const index = project.value.characters.findIndex((person) => person.id === item.id);
    if (index < 0 && project.value.characters.length >= 30) throw new Error("当前项目角色已达30位上限");
    if (index < 0) project.value.characters.push(item); else project.value.characters[index] = item;
    if (episode.value) {
      const castIndex = episode.value.castSnapshot.findIndex((person) => person.id === item.id);
      if (castIndex < 0 && episode.value.castSnapshot.length >= 30) throw new Error("本期角色已达30位上限");
      if (castIndex < 0) episode.value.castSnapshot.push(structuredClone(item)); else { item.aliases = [...new Set([...(episode.value.castSnapshot[castIndex]!.aliases || "").split(/[,，、;；\n]/), ...(item.aliases || "").split(/[,，、;；\n]/)].filter(Boolean))].join("，"); episode.value.castSnapshot[castIndex] = structuredClone(item); }
    }
  } else {
    const index = project.value.styles.findIndex((style) => style.id === item.id);
    if (index < 0) project.value.styles.push(item); else project.value.styles[index] = item;
    project.value.activeStyleId = item.id;
    if (episode.value) episode.value.styleSnapshot = structuredClone(item);
  }
  if (episode.value) for (const [name, id] of Object.entries(episode.value.roleBindings)) if (id && episode.value.castSnapshot.some(person => person.id === id)) bindStoryName(episode.value, name, id);
  await save();
}
function uploadPanel(event: Event, panel: Panel) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) void run("导入漫画图片", () => adoptImage(panel, file));
}
function switchImage(event: Event, panel: Panel) {
  panel.image = (event.target as HTMLSelectElement).value;
  panel.generationFingerprint = "";
  panel.approvalFingerprint = "";
  void run("读取历史图片", () => ensureImage(panel.image));
}
function approvePanel(panel: Panel) {
  if (!episode.value || !panel.image || panel.generationFingerprint !== imageInput(episode.value, panel)) return;
  panel.approvalFingerprint = reviewInput(episode.value, panel);
  void run("保存审稿结果", save);
}
watch([settingsVisible, settingsPanel], ([visible, panel]) => {
  if (!visible || panel === "comicDefaults") void loadModels();
});
onBeforeRouteLeave(() => !dirty.value || window.confirm("当前修改尚未保存，确定离开吗？"));
onMounted(() => {
  void loadModels();
  void run("读取本机漫画项目", async () => {
    await discoverProjects();
    const path = workspace.project?.directory;
    if (path && isComicDirectory(path)) await openProject(path);
  }).then(maybeCollect);
});
</script>

<style scoped lang="scss">
.castingOverview { margin-top:16px; summary { cursor:pointer; font-weight:600; } > div { display:flex; gap:12px; flex-wrap:wrap; align-items:center; border-top:1px solid var(--studioLine); padding:12px 0; } label { display:flex; gap:4px; align-items:center; } }
.spaceHeading { display: flex; justify-content: space-between; align-items: center; .spaceManage { border: 0; background: transparent; color: #e7eee8; font-size: 24px; padding: 0 8px; cursor: pointer; } }
.creationSummary { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin: 12px 0 18px; color: var(--studioMuted); }
.postToolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; select { flex: 1 1 140px; min-width: 0; } }
.postCandidate { padding: 14px; margin: 16px 0; border: 1px solid var(--studioAccent); border-radius: 10px; background: var(--studioPaper); }
.postReview { margin: 16px 0; padding: 14px; border: 1px solid var(--studioLine); border-radius: 10px; summary { cursor: pointer; font-weight: 600; } p, pre { overflow-wrap: anywhere; white-space: pre-wrap; } label { display: flex; align-items: center; gap: 8px; margin-top: 10px; input { width: auto; } } }
.generationStatus { display: grid; gap: 8px; margin: 12px 0; padding: 16px; border: 1px solid var(--studioAccent); border-radius: 12px; background: var(--studioCard); span, small { color: var(--studioMuted); overflow-wrap: anywhere; } progress { width: 100%; accent-color: var(--studioAccent); } }
.panelGeneration { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 20px; background: rgba(255,255,255,.88); color: #294936; text-align: center; progress { width: 90%; accent-color: #456f55; } }
.generationBrief { margin: 12px 0; padding: 12px; border: 1px solid var(--studioLine); border-radius: 10px; summary { cursor: pointer; font-weight: 600; } label { display: grid; gap: 6px; margin-top: 12px; } select, textarea { width: 100%; box-sizing: border-box; } textarea { min-height: 76px; resize: vertical; } pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; font-size: 12px; } details { margin-top: 12px; } }
.candidateNotice { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px; background: #fff6de; color: #654d1b; border-radius: 8px; margin: 10px 0; }
.imageComparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; figure { min-width: 0; margin: 0; display: grid; gap: 10px; } img { width: 100%; aspect-ratio: 3 / 4; object-fit: contain; background: #f3f4f0; border-radius: 8px; } select { width: 100%; } }
@media (max-width: 700px) { .imageComparison { grid-template-columns: 1fr; } }
.scriptWorkspace .scriptToolbar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 18px 20px; }
.scriptModel { flex: 1 1 220px; min-width: 0; display: grid; gap: 5px; overflow-wrap: anywhere; span { color: var(--studioMuted); font-size: 12px; } }
.scriptActions { display: flex; flex-wrap: wrap; gap: 8px; button { white-space: normal; } }
.scriptNotice { flex-basis: 100%; margin: 0; font-size: 13px; line-height: 1.7; color: var(--studioMuted); button { margin: 6px 14px 0 0; } }
.scriptIssue { flex-basis: 100%; margin: 0; padding: 10px 12px; border-radius: 7px; background: #fff2d9; color: #754d11; }
.ideaModes { display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid var(--studioLine); margin-bottom: 22px; padding-bottom: 12px; button { padding: 9px 16px; border: 1px solid transparent; background: transparent; color: var(--studioMuted); border-radius: 7px; cursor: pointer; } .selected { color: var(--studioAccent); border-color: var(--studioLine); background: var(--studioCard); font-weight: 600; } }
.sidebarTop { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0; }
.sidebarCollapse { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 32px; flex: 0 0 30px; border: 0; background: transparent; color: #aebfb4; border-radius: 6px; cursor: pointer; &:hover { background: #30473a; color: white; } }
.sidebarTree { flex: 1; min-height: 0; overflow-y: auto; margin-top: 8px; .navGroup { margin-bottom: 10px; } .navGroupHeading { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 8px; background: transparent; border: 0; border-radius: 8px; color: #e7eee8; text-align: left; font: inherit; cursor: pointer; font-weight: 600; span { flex: 1; } .groupChevron { transition: transform 0.18s; color: #aebfb4; } .rotated { transform: rotate(90deg); } } .stageNav { padding: 0; margin: 2px 0 0; overflow: visible; } .contextNav { padding: 2px 0 2px 8px; } .navGroupHeading { transition: background 0.18s, color 0.18s; &:hover { background: #2b4136; } &.currentGroup { color: #f3f7ee; background: #2b4136; } svg { flex-shrink: 0; } } }
.settingColumns { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.settingCard { padding: 20px; border: 1px solid var(--el-border-color); background: var(--el-fill-color-blank); border-radius: 12px; min-width: 0; }
@media(min-width: 601px) { .comicStudio.sidebarCollapsed .studioSidebar { width: 72px; flex-basis: 72px; padding: 20px 10px; .sidebarTop { flex-direction: column; } .studioBrand { justify-content: center; } .brandMark { display: flex; } .sidebarTree { overflow: visible; } .navGroupHeading { justify-content: center; } .sidebarBottom { span, a { display: none; } button { justify-content: center; font-size: 0; } } } }
@media(max-width: 700px) { .settingColumns { grid-template-columns: 1fr; } }

.contextNav { display: flex; flex-direction: column; flex: 1; padding: 12px 18px; gap: 4px; button { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px; color: #dae6dc; background: transparent; border: 0; border-radius: 8px; text-align: left; font: inherit; cursor: pointer; } button:hover { background: #2b4136; } .selected, .selected:hover { color: #22382c; background: #e6eadb; } small { color: #a7bcac; padding: 12px; } }

.presetArt { display: block; width: 100%; aspect-ratio: 1; background-size: 300% 200%; border-radius: 8px; }
.githubArt { display: block; width: 100%; height: 190px; object-fit: contain; background: #f1eee5; margin-bottom: 10px; }

.workspaceModes { display: grid; padding: 0 18px 10px; gap: 4px; button { flex: 1; padding: 10px 4px; border: 1px solid #52665b; border-radius: 7px; color: #e6eee7; background: transparent; } .selected { background: #e6eadb; color: #20372b; } }
.changeNote { margin-bottom: 16px; color: var(--studioMuted); summary { cursor: pointer; width: fit-content; padding: 5px 0; font-size: 12px; } .changeReason { margin: 12px 0 0; } }
.changeReason { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 24px; label { color: var(--studioMuted); } input { flex: 1; min-width: 180px; padding: 9px; border: 1px solid var(--studioLine); border-radius: 6px; background: var(--studioCard); color: var(--studioInk); } }

.comicStudio {
  --studioInk: #20382d;
  --studioMuted: #65756b;
  --studioAccent: #24694e;
  --studioLine: #dce3dc;
  --studioPaper: #f6f7f3;
  --studioCard: #ffffff;
  display: flex;
  min-height: 100dvh;
  color: var(--studioInk);
  background: var(--studioPaper);
  font:
    14px/1.6 -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
  button,
  select,
  input,
  textarea {
    font: inherit;
  }
  button,
  a,
  select,
  .uploadButton,
  .uploadTile,
  .characterImage {
    cursor: pointer;
  }
  button {
    transition:
      background 0.15s,
      color 0.15s;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  [tabindex]:focus-visible,
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 3px solid #85ad98;
    outline-offset: 3px;
  }
  input:not([type="checkbox"]):not([type="range"]):not([type="file"]):not([type="color"]),
  select,
  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--studioLine);
    border-radius: 7px;
    background: var(--studioCard, #fff);
    color: var(--studioInk);
  }
  textarea {
    resize: vertical;
  }
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px;
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--studioAccent);
  }
  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }
  h2 {
    font-size: 17px;
    font-weight: 650;
    margin-bottom: 14px;
  }
  h3 {
    font-size: 15px;
    font-weight: 600;
  }
  a {
    color: var(--studioAccent);
    text-decoration: none;
  }
  .studioSidebar {
    width: 228px;
    flex: 0 0 228px;
    position: sticky;
    top: 0;
    height: 100dvh;
    overflow-y: auto;
    background: #1c3028;
    color: #e5eee7;
    padding: 20px 14px 16px;
    display: flex;
    flex-direction: column;
    .studioBrand {
      display: flex;
      gap: 10px;
      align-items: center;
      color: #fff;
      font-size: 17px;
      letter-spacing: 0;
      font-weight: 650;
      padding: 0 8px;
    }
    .brandMark {
      width: 38px;
      height: 42px;
      border: 1px solid #73887b;
      display: grid;
      place-items: center;
      border-radius: 9px;
      color: #e3dcba;
    }
    .brandSub {
      display: block;
      font-size: 8px;
      letter-spacing: 1.2px;
      color: #a7b9ad;
      margin-top: 2px;
    }
    .projectSwitch {
      flex-shrink: 0;
      margin: 16px 0 8px;
      label {
        color: #a7b9ad;
        font-size: 11px;
      }
      select {
        color: #edf5ef;
        background: #2b4136;
        border-color: #4d6255;
        padding: 10px 8px;
        font-size: 13px;
      }
      .newProject {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        color: #dce9df;
        background: transparent;
        border: 1px dashed #607265;
        border-radius: 6px;
        min-height: 36px;
        margin-top: 10px;
        font-size: 12px;
      }
    }
    .navLabel {
      font-size: 10px;
      letter-spacing: 2px;
      color: #a7b9ad;
      margin: 0 12px 10px;
    }
    .stageNav {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      button {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) 14px 14px;
        align-items: center;
        gap: 8px;
        text-align: left;
        border: 0;
        border-radius: 7px;
        padding: 10px 10px;
        color: #bfcec3;
        background: transparent;
        min-height: 44px;
        &:hover {
          background: #2b4136;
        }
        &.active {
          background: #e6ecdf;
          color: #20382d;
          font-weight: 650;
        }
      }
      .navIcon { flex: 0 0 18px; }
      .navText { flex: 1; white-space: nowrap; }
      .stageNumber {
        min-width: 14px;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        opacity: 0.75;
      }
      .stageDone {
        flex: 0 0 14px;
      }
    }
    .sidebarBottom {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 12px;
      button,
      a {
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        color: #cedbd1;
        border: 0;
        padding: 11px 12px;
        font-size: 12px;
        width: 100%;
        border-radius: 8px;
        &:hover { color: #fff; background: #2b4136; }
      }
      .localNote {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: #a2b7a8;
        margin: 10px 8px 0;
        span {
          height: 5px;
          width: 5px;
          border-radius: 50%;
          background: #8bbd98;
        }
      }
    }
  }
  .studioMain {
    flex: 1;
    min-width: 0;
  }
  .studioHeader {
    height: 76px;
    padding: 0 42px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--studioLine);
    background: var(--studioCard, #fff);
    gap: 15px;
    .breadcrumb {
      color: var(--studioMuted);
      font-size: 12px;
      span {
        margin: 0 14px;
        color: #bbc7bd;
      }
      strong {
        color: var(--studioInk);
        font-weight: 500;
      }
    }
    .headerActions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .saveState {
      color: var(--studioMuted);
      font-size: 11px;
    }
  }
  .studioContent {
    max-width: 1600px;
    margin: auto;
    padding: 22px 32px 24px;
  }
  .pageHeading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    margin-bottom: 20px;
    h1 {
      font-size: clamp(22px, 2vw, 28px);
      font-weight: 600;
      letter-spacing: -0.7px;
      margin: 7px 0 9px;
    }
    p {
      color: var(--studioMuted);
      font-size: 12px;
      margin: 0;
    }
    .episodeBadge {
      border-left: 2px solid #b5c9b8;
      padding-left: 14px;
      min-width: 160px;
      max-width: 240px;
      span,
      small {
        display: block;
        color: var(--studioMuted);
        font-size: 10px;
      }
      strong {
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin: 4px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  .eyebrow {
    color: #6f8071;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2px;
  }
  .stageFields {
    padding: 0;
    margin: 0;
    min-width: 0;
    border: 0;
  }
  .primaryButton,
  .secondaryButton,
  .textButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 6px;
    padding: 10px 16px;
    min-height: 40px;
    white-space: nowrap;
    font-size: 12px;
    text-decoration: none;
  }
  .primaryButton {
    background: var(--studioAccent);
    color: #fff;
    &:hover {
      background: #174e39;
    }
  }
  .secondaryButton {
    background: var(--studioCard, #fff);
    border: 1px solid #d3ded5;
    color: var(--studioInk);
    &:hover {
      background: #eff3ed;
    }
  }
  .textButton {
    background: transparent;
    color: var(--studioAccent);
    padding: 5px 2px;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
    .inlineFields {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      label {
        margin: 0 4px 0 0;
        font-size: 12px;
      }
      select {
        width: auto;
        max-width: 280px;
      }
    }
  }
  .helperText {
    color: var(--studioMuted);
    font-size: 11px;
    line-height: 1.8;
  }
  .surface {
    background: var(--studioCard, #fff);
    padding: 24px;
    border: 1px solid var(--studioLine);
    border-radius: 10px;
    min-width: 0;
  }
  .sectionTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    h2 {
      margin: 0;
    }
    > span {
      font-size: 11px;
      color: var(--studioMuted);
    }
  }
  .topicGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .topicCard {
    display: flex;
    flex-direction: column;
    min-height: 240px;
    padding: 22px;
    border: 1px solid var(--studioLine);
    background: var(--studioCard, #fff);
    border-radius: 9px;
    .cardMeta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--studioMuted);
      font-size: 10px;
      margin-bottom: 16px;
      span {
        color: #397758;
        font-weight: 600;
      }
    }
    h2 {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    p {
      font-size: 11px;
      color: var(--studioMuted);
      line-height: 1.9;
    }
    .cardFooter {
      margin-top: auto;
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #edf0e9;
      a {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
      }
      .textButton {
        font-size: 11px;
      }
    }
  }
  .episodeStrip {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 14px 0;
    border-bottom: 1px solid var(--studioLine);
    > span {
      font-size: 11px;
      align-self: center;
      margin-right: 5px;
    }
    button {
      border: 1px solid var(--studioLine);
      background: var(--studioCard, #fff);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 11px;
      max-width: 230px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      &.selected {
        background: #e3ecdf;
        border-color: #bacdb8;
      }
    }
  }
  .splitColumns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 22px;
    .contextColumn {
      display: flex;
      flex-direction: column;
      gap: 18px;
      h3 {
        margin-top: 12px;
        font-size: 14px;
        line-height: 1.8;
      }
      a {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
      }
      .noteCard {
        background: #eef2e8;
        border-color: #d9e1d1;
        p {
          margin: 8px 0;
          font-size: 12px;
        }
        small {
          display: block;
          color: #657561;
          line-height: 1.8;
          font-size: 11px;
        }
      }
    }
  }
  .sourceTag,
  .statusTag {
    background: #edf3e9;
    border: 1px solid #d7e4d4;
    padding: 3px 8px;
    border-radius: 4px;
    color: #3c6e45;
    font-size: 10px;
    &.pending {
      background: #f7f1e5;
      border-color: #eadbb9;
      color: #815c21;
    }
  }
  .generationBar {
    > input {
      width: 170px !important;
    }
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 18px;
    select {
      width: auto;
      max-width: 200px;
    }
  }
  .checkLabel {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 12px;
    font-weight: 400;
    input {
      accent-color: var(--studioAccent);
      margin-top: 4px;
    }
  }
  .countLabel {
    color: var(--studioMuted);
    font-size: 12px;
  }
  .storyboardList {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .storyboardRow {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) minmax(0, 0.8fr);
    gap: 22px;
    background: var(--studioCard, #fff);
    padding: 22px;
    border: 1px solid var(--studioLine);
    border-radius: 9px;
    .frameIndex {
      padding-top: 8px;
      strong {
        font-size: 27px;
        color: #8da28e;
        font-weight: 400;
      }
      > div {
        display: flex;
        gap: 2px;
        margin-top: 14px;
      }
      button {
        border: 1px solid var(--studioLine);
        background: var(--studioCard, #fff);
        border-radius: 4px;
        padding: 7px 3px;
      }
    }
    label:first-child {
      margin-top: 0;
    }
    .characterChecks {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
  }
  .assetsStage {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .styleVersions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 20px 0;
    button {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      min-width: 185px;
      padding: 18px;
      border: 1px solid var(--studioLine);
      border-radius: 8px;
      background: var(--studioCard, #fff);
      color: var(--studioInk);
      &.selected {
        border-color: #769b79;
        background: #f0f4eb;
      }
      small {
        font-size: 10px;
        color: var(--studioMuted);
      }
      .versionNumber {
        font-size: 10px;
        letter-spacing: 2px;
        color: #6a886b;
      }
      strong {
        font-size: 13px;
      }
      .statusTag {
        margin-top: 8px;
      }
    }
  }
  .artNavigation, .characterPicker { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 18px; button { padding: 12px 18px; border: 1px solid var(--studioLine); border-radius: 10px; background: var(--studioCard); color: var(--studioInk); cursor: pointer; &.selected { border-color: #507357; box-shadow: inset 0 -3px #507357; } } }
  .characterPicker button { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; text-align: left; img { width: 46px; height: 54px; object-fit: contain; grid-row: span 2; } small { color: var(--studioMuted); } }
  .assetsStage .characterWorkspace { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 24px; align-items: start; }
  .assetsStage .characterSidebar { position: sticky; top: 12px; min-width: 0; }
  .assetsStage .characterPicker { display: flex; flex-direction: column; flex-wrap: nowrap; max-height: 580px; overflow-y: auto; button { width: 100%; padding: 10px; min-height: 64px; } }
  .assetsStage .characterGrid { display: block; margin-top: 0; min-width: 0; .characterCard { max-width: 860px; margin: 0 auto; gap: 8px; } }
  .assetsStage .characterImage { height: 230px; }
  @media (max-width: 900px) { .assetsStage .characterWorkspace { grid-template-columns: 1fr; } .assetsStage .characterSidebar { position: static; } .assetsStage .characterPicker { max-height: 200px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  .assetsStage .characterImage { max-height: 300px; img { object-fit: contain; max-height: 280px; } }
  .modelDisclosure summary, .characterDesign summary, .styleDraft summary { cursor: pointer; font-weight: 600; padding: 10px 0; }
  .actingEditor { margin-top: 16px; padding: 12px; border: 1px solid var(--studioLine); border-radius: 8px; }
  .styleDraft {
    padding-top: 20px;
    border-top: 1px solid var(--studioLine);
    > button {
      margin-top: 16px;
    }
  }
  .twoFields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .referenceGrid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    figure {
      margin: 0;
      width: 170px;
      img {
        width: 100%;
        height: 130px;
        object-fit: contain;
        background: #f2f4ee;
        border: 1px solid var(--studioLine);
        border-radius: 6px;
      }
      input {
        font-size: 11px !important;
        padding: 7px !important;
        margin-top: 5px;
      }
    }
    .uploadTile {
      margin: 0;
      width: 170px;
      min-height: 130px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 1px dashed #a9bbae;
      border-radius: 6px;
      color: #5a7965;
      font-size: 11px;
      input {
        display: none;
      }
    }
  }
  .characterGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 20px;
    .characterCard {
      border: 1px solid var(--studioLine);
      padding: 16px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;

    }
    .characterImage {
      height: 180px;
      margin: 0 0 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f3ec;
      border-radius: 5px;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      span {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        color: #6b8171;
        font-size: 11px;
      }
      input {
        display: none;
      }
    }
  }
  .bindingBar {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: center;
    background: #e6eddf;
    border: 1px solid #c4d5bd;
    border-radius: 8px;
    padding: 20px 24px;
    strong {
      font-size: 13px;
    }
    p {
      color: #526a55;
      font-size: 11px;
      margin: 4px 0 0;
    }
  }
  .imageGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 24px;
    .imageCard {
      background: var(--studioCard, #fff);
      border: 1px solid var(--studioLine);
      border-radius: 9px;
      overflow: hidden;
    }
    .panelArt {
      position: relative;
      aspect-ratio: 3 / 4;
      background: #e9eee5;
      display: grid;
      place-items: center;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      > span:not(.artIndex) {
        color: #718674;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        font-size: 12px;
      }
      .artIndex {
        position: absolute;
        left: 12px;
        top: 12px;
        background: var(--studioCard, #fff);
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
      }
    }
    .imageCardBody {
      padding: 18px;
      p {
        font-size: 11px;
        color: var(--studioMuted);
        margin: 12px 0;
      }
    }
  }
  .panelActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
    .uploadButton {
      margin: 0;
      font-weight: 400;
      input {
        display: none;
      }
    }
  }
  .warningText {
    color: #8b5b13;
    font-size: 11px;
  }
  .versionSelect {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 12px;
    label {
      margin: 0;
      font-size: 11px;
      white-space: nowrap;
    }
    select {
      padding: 7px;
      font-size: 11px;
    }
  }
  .layoutStage {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    .layoutControls {
      align-self: start;
      .layoutControlGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 18px; label { margin-top: 0; } }
      .flavorToggle { display: flex; align-items: end; label { display: flex; align-items: center; gap: 8px; min-height: 38px; } input { width: auto; } }
      > button {
        margin-top: 12px;
      }
    }
    .letteringRows {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  }
  .pagePreviews {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 24px;
    img {
      width: 100%;
      border: 1px solid #cdd8ce;
      box-shadow: 0 6px 24px #20382d0a;
    }
  }
  .reviewSummary {
    display: flex;
    gap: 30px;
    align-items: center;
    padding: 22px 26px;
    border: 1px solid var(--studioLine);
    border-radius: 9px;
    background: #edf2e7;
    margin-bottom: 22px;
    > div {
      min-width: 110px;
      strong {
        font-size: 32px;
        font-weight: 500;
        span {
          font-size: 15px;
          color: #829281;
        }
      }
      p {
        margin: 0;
        font-size: 11px;
      }
    }
    > p {
      flex: 1;
      font-size: 12px;
      color: var(--studioMuted);
      margin: 0;
    }
  }
  .reviewList {
    display: flex;
    flex-direction: column;
    gap: 18px;
    .reviewCard {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 24px;
      img {
        width: 100%;
        max-height: 240px;
        object-fit: contain;
        background: #eff2eb;
      }
      p {
        font-size: 12px;
        color: var(--studioMuted);
      }
      blockquote {
        margin: 10px 0;
        padding: 10px 14px;
        border-left: 2px solid #b7c9b1;
        background: #f6f8f2;
        font-size: 12px;
      }
    }
  }
  .exportCard {
    text-align: center;
    align-self: start;
    .exportIcon {
      display: inline-grid;
      place-items: center;
      color: var(--studioAccent);
      width: 80px;
      height: 80px;
      background: #eaf0e2;
      border-radius: 18px;
      margin: 12px 0 22px;
    }
    p {
      color: var(--studioMuted);
      font-size: 12px;
      line-height: 1.9;
    }
    dl {
      margin: 24px 0;
      font-size: 11px;
      div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px solid var(--studioLine);
        padding: 10px 0;
      }
      dt {
        color: var(--studioMuted);
      }
      dd {
        margin: 0;
      }
    }
  }
  .stageFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--studioLine);
    padding: 22px 0 4px;
    margin-top: 32px;
    > span {
      font-size: 11px;
      color: var(--studioMuted);
    }
  }
  .welcomePanel {
    max-width: 920px;
    margin: 80px auto;
    text-align: center;
    h1 {
      font-size: clamp(28px, 4vw, 50px);
      letter-spacing: -2px;
      margin: 18px 0 24px;
      font-weight: 550;
    }
    > p {
      color: var(--studioMuted);
      line-height: 2.2;
      margin-bottom: 30px;
    }
    .welcomeFlow {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 70px;
      text-align: left;
      span {
        padding: 18px;
        background: var(--studioCard, #fff);
        border: 1px solid var(--studioLine);
        border-radius: 8px;
        font-size: 12px;
        b {
          display: block;
          color: #829a81;
          font-size: 10px;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }
      }
    }
  }
  .stageNotice {
    text-align: center;
    padding: 80px 20px;
    color: var(--studioMuted);
    h2 {
      margin-top: 20px;
    }
  }
  .dialogForm {
    display: flex;
    flex-direction: column;
    gap: 8px;
    input,
    textarea {
      border: 1px solid #cad5cc;
      padding: 10px;
      border-radius: 6px;
      width: 100%;
    }
  }
  @media (max-width: 1200px) {
    .studioSidebar {
      width: 204px;
      flex-basis: 204px;
      padding-inline: 12px;
    }
    .studioContent {
      padding: 30px 26px;
    }
    .studioHeader {
      padding: 0 26px;
    }
    .topicGrid,
    .imageGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .splitColumns {
      grid-template-columns: minmax(0, 1fr) 260px;
    }
  }
  @media (max-width: 900px) {
    .studioSidebar {
      width: 168px;
      flex-basis: 168px;
      .studioBrand {
        font-size: 16px;
        gap: 7px;
      }
      .brandMark {
        display: none;
      }
      .stageNav button {
        gap: 9px;
        padding: 11px 8px;
        font-size: 12px;
      }
    }
    .studioContent {
      padding: 24px 20px;
    }
    .splitColumns {
      grid-template-columns: 1fr;
      .contextColumn {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }
    .characterGrid {
      grid-template-columns: 1fr 1fr;
    }
    .pageHeading .episodeBadge {
      display: none;
    }
    .bindingBar {
      align-items: flex-start;
      flex-direction: column;
    }
    .layoutStage {
      grid-template-columns: 1fr;
      .layoutControls {
        position: static;
      }
    }
    .storyboardRow {
      gap: 12px;
      grid-template-columns: 38px minmax(0, 1fr);
      .storyboardDialogue {
        grid-column: 2;
      }
    }
    .reviewSummary {
      gap: 15px;
      flex-wrap: wrap;
    }
  }
  @media (max-width: 600px) {
    input,
    select,
    textarea {
      font-size: 16px !important;
    }
    .primaryButton,
    .secondaryButton {
      min-height: 44px;
    }
    flex-direction: column;
    .studioSidebar {
      position: static;
      width: 100%;
      height: auto;
      overflow: visible;
      flex-basis: auto;
      padding: 16px;
      .studioBrand {
        font-size: 18px;
      }
      .projectSwitch {
        margin: 16px 0 10px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 100px;
        gap: 8px;
        label {
          grid-column: 1 / -1;
          margin: 0;
        }
        .newProject {
          margin: 0;
        }
      }
      .navLabel { display: none; }
      .sidebarBottom { padding-top: 8px; .localNote { display: none; } }
      .stageNav {
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        gap: 4px;
        button {
          display: flex;
          flex: 0 0 auto;
          padding: 8px 4px;
          min-height: 45px;
          flex-direction: row;
          gap: 5px;
          font-size: 12px;
          .stageNumber {
            font-size: 9px;
          }
          .stageDone {
            display: none;
          }
        }
      }
    }
    .studioHeader {
      height: auto;
      min-height: 64px;
      padding: 12px 18px;
      flex-wrap: wrap;
      .breadcrumb {
        font-size: 11px;
      }
      .saveState {
        font-size: 10px;
      }
    }
    .studioContent {
      padding: 24px 16px;
    }
    .pageHeading {
      margin-bottom: 22px;
      h1 {
        font-size: 24px;
      }
      p {
        font-size: 11px;
      }
    }
    .topicGrid,
    .imageGrid,
    .characterGrid,
    .pagePreviews {
      grid-template-columns: 1fr;
    }
    .splitColumns .contextColumn {
      grid-template-columns: 1fr;
    }
    .surface {
      padding: 18px;
    }
    .toolbar .inlineFields {
      width: 100%;
      select {
        max-width: 100%;
      }
    }
    .twoFields {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .reviewList .reviewCard {
      grid-template-columns: 1fr;
      img {
        max-height: 400px;
      }
    }
    .welcomePanel {
      margin: 40px auto;
      .welcomeFlow {
        grid-template-columns: repeat(2, 1fr);
        margin-top: 40px;
      }
    }
    .reviewSummary > p {
      flex-basis: 100%;
    }
    .generationBar > * {
      width: 100% !important;
      max-width: 100% !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }
}
.dialogForm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  label {
    font-size: 13px;
    margin-top: 10px;
  }
  input,
  textarea {
    border: 1px solid #cad5cc;
    padding: 10px;
    border-radius: 6px;
    width: 100%;
    font: inherit;
  }
}
.dialogInput {
  width: 100%;
  padding: 12px;
  border: 1px solid #cad5cc;
  border-radius: 7px;
  font: inherit;
  margin-top: 8px;
}

:global(.platformDialog) {
  background: #ffffff !important;
  color: #20382d;
  --el-bg-color: #ffffff;
  --el-dialog-bg-color: #ffffff;
  --el-text-color-primary: #20382d;
  --el-text-color-regular: #33483d;
  --el-color-info: #65756b;

}
.connectionContent {
  line-height: 1.7;
  color: #33483d;
  > p { margin: 0 0 16px; }
  .connectionCard { padding: 18px; border: 1px solid #dce5de; border-radius: 12px; margin-bottom: 16px; background: #fbfcfa; }
  .connectionTitle { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; h3 { margin: 0; color: #1f3e2e; } }
  .connectionStatus { background: #e7efe7; color: #315e44; border-radius: 20px; padding: 2px 10px; font-size: 12px; }
  .connectionNote { color: #5e6c63; font-size: 12px; }
  ol { padding-left: 22px; }
  button { min-height: 44px; padding: 9px 16px; border-radius: 7px; cursor: pointer; font: inherit; margin: 4px 8px 4px 0; &:disabled { opacity: .6; cursor: wait; } }
  .connectionButton { background: #315e44; color: white; border: 1px solid #315e44; }
  .connectionSecondary { background: white; color: #315e44; border: 1px solid #cad5cc; }
  .loginQr { margin: 16px 0; text-align: center; img { width: 220px; max-width: 100%; } figcaption { font-size: 12px; } }
  summary { cursor: pointer; padding: 8px 0; }
  a { color: #315e44; text-decoration: underline; }
  button:focus-visible, summary:focus-visible, a:focus-visible { outline: 3px solid #cc8d43; outline-offset: 3px; }
}
.comicStudio {
  .sourceIntro { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; padding: 16px 20px; margin-bottom: 20px; border: 1px solid #dce5de; border-radius: 12px; background: #f4f7f1; p { margin: 6px 0 0; font-size: 13px; } }
  .searchRow { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 16px; }
  .rawTopics { margin-top: 24px; summary { cursor: pointer; padding: 16px 0; font-weight: 600; } > button { margin: 12px 0; } }
}

@font-face { font-family: "Xiaoleng WenKai"; src: url("/fonts/wenKai.ttf") format("truetype"); font-weight: 400 600; font-display: swap; }
.comicStudio {
  .brandMark { padding: 0; border: none; background: transparent; img { width: 42px; height: 42px; } }
  .brandSub { letter-spacing: .08em; }
  .primaryButton { background: var(--studioAccent); border-color: var(--studioAccent); }
  .presetGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .presetCard { border: 1px solid var(--studioLine); border-radius: 10px; overflow: hidden; background: var(--studioCard); button { display: grid; width: 100%; gap: 7px; padding: 12px; color: var(--studioInk); background: transparent; border: 0; text-align: left; cursor: pointer; svg { width: 100%; height: auto; } strong { font-size: 15px; } small { color: var(--studioMuted); } } a { display: block; font-size: 12px; padding: 0 12px 12px; color: var(--studioAccent); } &:hover, &:focus-within { outline: 2px solid var(--studioAccent); outline-offset: 1px; } }
  .productionStatus { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; button { border: 1px solid var(--studioLine); border-radius: 18px; background: var(--studioCard); color: var(--studioInk); padding: 7px 12px; min-height: 36px; cursor: pointer; } }
  .drawingTabs { margin: 16px 0; button { display: grid; gap: 6px; } img { width: 72px; height: 90px; object-fit: contain; } }
  .singlePanelGrid { grid-template-columns: minmax(0, 1fr); .imageCard { max-width: 900px; } .panelArt { max-height: 620px; } }
  .layoutWorkspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
  .letteringTabs { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; button { border: 1px solid var(--studioLine); background: var(--studioCard); color: var(--studioInk); border-radius: 7px; padding: 9px 13px; cursor: pointer; &.selected { background: var(--studioAccent); color: white; } } }
  .pagePreviewColumn { min-width: 0; position: sticky; top: 20px; h3 { margin-top: 0; } .pagePreviews { display: grid; grid-template-columns: 1fr; margin-top: 10px; img { cursor: zoom-in; } } }
  @media (max-width: 1000px) { .layoutWorkspace { grid-template-columns: minmax(0, 1fr); } .pagePreviewColumn { position: static; } }
  .previewWarning { background: #fff2d9; color: #754d11; border-radius: 8px; padding: 16px; }
  &.nightStudio { --studioInk: #e0e9e1; --studioMuted: #b3c4b8; --studioPaper: #17231d; --studioCard: #25342b; --studioLine: #48604e;
    .studioHeader, .sourceIntro, .topicCard, .surface, .characterCard, .storyboardRow, .imageCard, .styleDraft, .stageFooter, .reviewSummary, .bindingBar { background: var(--studioCard); color: var(--studioInk); }
    input, textarea, select { background: #1b2a21; color: #e0e9e1; border-color: #516b59; }
    .secondaryButton { background: #2d4435; color: #e0e9e1; }
    blockquote, .statusTag, .sourceTag, .episodeStrip button, .styleVersions button { background: #344b3b; color: #e0e9e1; }
    .reviewSummary p, .reviewSummary strong, .reviewSummary span { color: #e0e9e1; }
    .reviewList .reviewCard blockquote { background: #344b3b; color: #e0e9e1; }
    h1, h2, h3, strong, label { color: inherit; }
  }
  &.largeStudio { font-size: 17px; .helperText, .topicCard p, .pageHeading p, .countLabel, .sourceTag { font-size: 15px; } input, textarea, select { font-size: 17px; } }
  @media (max-width: 900px) { .presetGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 900px) { .layoutWorkspace { grid-template-columns: 1fr; } .pagePreviewColumn { position: static; } }
  @media (min-width: 601px) { .studioSidebar { overflow: hidden; } .studioBrand, .projectSwitch, .sidebarBottom { flex-shrink: 0; } .sidebarTree { scrollbar-gutter: stable; } .stageNav { min-height: 0; overflow: visible; flex: none; button { flex-shrink: 0; } } }
  @media (max-width: 600px) { .headerActions { flex-wrap: wrap; gap: 6px; } .productionStatus { gap: 6px; } }
}
.comicSettings { color: #294235; line-height: 1.7; display: grid; gap: 8px; h3 { margin: 15px 0 2px; } label { font-size: 13px; } input, select { width: 100%; min-height: 42px; border: 1px solid #c5d4c9; border-radius: 7px; padding: 8px 10px; box-sizing: border-box; font: inherit; color: #294235; background: white; } p { margin: 4px 0 8px; font-size: 13px; } button { min-height: 44px; background: #315e44; border: 0; border-radius: 7px; padding: 10px 14px; color: white; cursor: pointer; } summary { cursor: pointer; } }

.productionHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; h2 { font-size: 20px; margin: 0; } p { color: var(--studioMuted); font-size: 12px; margin: 5px 0 0; } }
.productionModes { display: flex; gap: 6px; padding: 5px; background: #e9ede5; border-radius: 10px; width: fit-content; button { border: 0; background: transparent; color: #60705d; border-radius: 7px; padding: 10px 20px; font: inherit; text-align: left; cursor: pointer; small { display: block; font-size: 11px; margin-top: 3px; font-weight: normal; } &.selected { background: white; color: #294d35; box-shadow: 0 1px 4px #20302115; font-weight: 600; } } }
.productionSettings { margin: 12px 0; summary { cursor: pointer; font-size: 12px; color: var(--studioMuted); padding: 8px 0; } .toolbar { padding: 12px; background: var(--studioCard); border: 1px solid var(--studioLine); border-radius: 10px; } }
.productionSteps { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin: 14px 0; font-size: 13px; span { font-size: 12px; color: var(--studioMuted); } }
.comicStudio .panelWorkspace { display: grid; grid-template-columns: 112px minmax(0, 1fr); border: 1px solid var(--studioLine); border-radius: 14px; overflow: hidden; background: var(--studioCard);
  .drawingTabs { grid-column: auto; display: flex; flex-direction: column; margin: 0; padding: 10px; gap: 10px; background: #f0f3ed; button { min-width: 0; width: 100%; padding: 6px; font-size: 11px; } img { width: 100%; height: 94px; } }
  .singlePanelGrid { margin: 0; display: block; .imageCard { display: grid; grid-template-columns: minmax(220px, 1fr) 290px; max-width: none; border: 0; border-radius: 0; } .panelArt { aspect-ratio: auto; min-height: 440px; max-height: none; padding: 18px; background: #e9ece6; img { max-height: 650px; object-fit: contain; height: auto; } } .imageCardBody { min-width: 0; padding: 18px; h3 { font-size: 15px; margin: 0 0 16px; } textarea { width: 100%; } summary { padding: 10px 0; cursor: pointer; font-size: 12px; } } }
}
.comicStudio .layoutStage { gap: 0; .layoutControls { margin-bottom: 16px; padding: 12px 16px; summary { cursor: pointer; font-size: 13px; } } .layoutWorkspace { grid-template-columns: 112px minmax(0, 1fr); gap: 0; border: 1px solid var(--studioLine); border-radius: 12px; overflow: hidden; background: var(--studioCard); } .letteringTabs { grid-column: auto; display: flex; flex-direction: column; background: #f0f3ed; padding: 10px; margin: 0; button { font-size: 12px; } } .letteringRows .surface { border: 0; padding: 16px; h3 { margin: 0; font-size: 14px; } > details { margin: 10px 0; } } .pagePreviewColumn { grid-column: 2; position: static; padding: 16px; summary { cursor: pointer; } } }
@media (max-width: 1100px) { .comicStudio .panelWorkspace .singlePanelGrid .imageCard { grid-template-columns: minmax(180px, 1fr) 250px; } }
@media (max-width: 760px) { .comicStudio .panelWorkspace { grid-template-columns: 1fr; .drawingTabs { flex-direction: row; overflow-x: auto; button { min-width: 80px; } img { height: 60px; } } .singlePanelGrid .imageCard { grid-template-columns: 1fr; } } .comicStudio .layoutStage { .layoutWorkspace { grid-template-columns: 1fr; } .letteringTabs { flex-direction: row; overflow-x: auto; } .pagePreviewColumn { grid-column: 1; } } .productionModes button { padding: 8px 12px; } }
@media (min-width: 761px) { .comicStudio .panelWorkspace { height: max(460px, calc(100vh - 375px)); .drawingTabs, .imageCardBody { overflow-y: auto; } .singlePanelGrid { min-height: 0; .imageCard { height: 100%; min-height: 0; } .panelArt { min-height: 0; overflow: auto; img { max-height: 100%; } } } } }

.productionHeader { margin-bottom: 12px; }
.productionNavigation { display: inline-block; vertical-align: top; margin-right: 20px; }
.productionSettings { display: inline-block; vertical-align: top; max-width: 100%; margin: 12px 0 16px; &[open] { display: block; } }
.comicStudio .layoutStage .layoutControls { margin: 12px 0; }
.comicStudio .layoutStage .layoutWorkspace { margin-top: 0; }

.discoveryHeader { display: flex; justify-content: space-between; align-items: start; gap: 24px; margin-bottom: 24px; h1 { font-size: 26px; margin: 8px 0; } p { color: var(--studioMuted); font-size: 13px; margin: 0; } }
.resumeStories { font-size: 12px; max-width: 280px; summary { cursor: pointer; padding: 10px; border: 1px solid var(--studioLine); border-radius: 8px; } button { display: block; width: 100%; background: var(--studioCard); border: 1px solid var(--studioLine); color: var(--studioInk); padding: 10px; text-align: left; cursor: pointer; } }
.startChoices { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; button { display: flex; align-items: center; gap: 14px; padding: 18px; text-align: left; border: 1px solid var(--studioLine); background: var(--studioCard); border-radius: 12px; cursor: pointer; color: var(--studioMuted); strong { display: block; font-size: 15px; } small { display: block; margin-top: 4px; font-size: 12px; } &.selected { border-color: #54775b; box-shadow: inset 0 0 0 1px #54775b; color: #33523d; background: #eef3e9; } } }
.comicStudio .discoverySearch { padding: 22px; margin-bottom: 24px; .discoverySearchRow { display: flex; gap: 10px; input { flex: 1; min-width: 0; margin: 0; } button { white-space: nowrap; } } .discoveryOptions { border-top: 1px solid var(--studioLine); margin-top: 14px; summary { padding: 12px 0; cursor: pointer; font-size: 12px; color: var(--studioMuted); } input[type="checkbox"] { width: auto; } } .discoveryUtilities { display: flex; gap: 20px; font-size: 12px; } }
.suggestedKeywords { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; color: var(--studioMuted); button { border: 0; background: #edf1e9; border-radius: 16px; color: #596f57; padding: 5px 10px; cursor: pointer; } }
.searchStatus { background: var(--studioPaper); padding: 10px; font-size: 12px; line-height: 1.6; }.discoveryEmpty { padding: 32px; text-align: center; color: var(--studioMuted); h3 { font-size: 16px; } p { font-size: 13px; } }
.comicStudio .inspirationResults { .sectionTitle h2 { font-size: 18px; small { margin-left: 10px; font-size: 12px; color: var(--studioMuted); font-weight: normal; } } .topicGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .topicCard { h2 { font-size: 17px; line-height: 1.5; } .cardFooter { flex-wrap: wrap; gap: 10px; } } .ideaDetails summary { cursor: pointer; font-size: 12px; padding: 8px 0; color: var(--studioMuted); } }
.writingChoices { display: flex; gap: 8px; margin-bottom: 16px; button { padding: 8px 14px; border: 0; border-radius: 8px; background: transparent; color: var(--studioMuted); cursor: pointer; &.selected { background: #e6ecdf; color: #33523d; } } }
.castingOptions { border-top: 1px solid var(--studioLine); margin: 16px 0; summary { cursor: pointer; padding: 12px 0; font-size: 13px; } }
.researchBack { display: flex; gap: 20px; align-items: center; margin-bottom: 12px; span { color: var(--studioMuted); font-size: 12px; } }
@media (max-width: 700px) { .discoveryHeader { flex-direction: column; gap: 12px; }.startChoices { gap: 8px; button { padding: 12px; svg { display: none; } } } .comicStudio .inspirationResults .topicGrid { grid-template-columns: 1fr; }.comicStudio .discoverySearch .discoverySearchRow { flex-direction: column; } }

.writingNotice { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; padding: 12px 16px; margin-bottom: 16px; border: 1px solid #e6d8bb; background: #fff9eb; border-radius: 10px; font-size: 12px; }
.writingColumns { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
.comicStudio .writingWorkspace { .manuscript { padding: 24px; h3 { margin: 0; font-size: 16px; } .sectionTitle span { font-size: 11px; } #episodeTitle { font-size: 18px; font-weight: 600; } .storyEditor { min-height: 450px; line-height: 1.95; resize: vertical; background: #fffefb; } } .writingInspector { display: grid; gap: 12px; min-width: 0; .surface { padding: 18px; } h3 { margin: 0; font-size: 15px; } .writeAction { width: 100%; justify-content: center; margin-top: 16px; } .writingDetails { summary { cursor: pointer; font-size: 12px; padding: 5px 0; color: var(--studioInk); overflow-wrap: anywhere; } h3 { line-height: 1.6; margin-top: 12px; font-size: 13px; } } } }
.comicStudio .boardWorkspace { display: grid; grid-template-columns: 190px minmax(0, 1fr); border: 1px solid var(--studioLine); border-radius: 12px; overflow: hidden; background: var(--studioCard); align-items: start;
  .boardRail { padding: 12px; background: #eef2e9; display: grid; gap: 8px; align-content: start; .boardRailTitle { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 3px 0 8px; } > button { display: flex; gap: 9px; align-items: start; width: 100%; padding: 12px 9px; background: var(--studioCard); border: 1px solid transparent; border-radius: 8px; text-align: left; color: var(--studioInk); cursor: pointer; strong { display: block; font-size: 12px; } small { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 11px; color: var(--studioMuted); line-height: 1.6; margin-top: 4px; } &.selected { border-color: #52745b; box-shadow: inset 0 0 0 1px #52745b; background: #e0eadd; } } .boardNumber { color: #81917a; font-size: 20px; } }
  .storyboardList { min-width: 0; }.storyboardRow { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; padding: 20px; border: 0; border-radius: 0; .frameIndex { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: 0 0 12px; border-bottom: 1px solid var(--studioLine); > div { margin: 0; gap: 6px; } strong { font-size: 20px; } } .storyboardText, .storyboardDialogue { min-width: 0; } h3 { font-size: 15px; margin: 0 0 16px; } .characterChecks { gap: 8px; label { padding: 6px 8px; background: var(--studioPaper); border-radius: 6px; font-size: 12px; margin: 0; } } .actingEditor { padding: 10px 12px; margin-top: 10px; summary { cursor: pointer; font-size: 12px; } } }
  .boardDetails { border-top: 1px solid var(--studioLine); margin-top: 14px; summary { cursor: pointer; padding: 10px 0; font-size: 12px; color: var(--studioMuted); } }
  .dialogueHeader, .boardSpeechHeader { display: flex; justify-content: space-between; align-items: center; gap: 10px; h3 { margin: 0; } label { margin: 0; } } .dialogueHeader { margin-bottom: 16px; } .boardSpeech { padding: 12px; border: 1px solid var(--studioLine); border-radius: 8px; margin-bottom: 12px; select { margin: 8px 0 4px; } small { color: var(--studioMuted); display: block; font-size: 11px; } textarea { margin-top: 8px; } } .boardEmpty { text-align: center; padding: 60px 20px; }
}
.comicStudio .boardStory { padding: 12px 16px; margin-bottom: 16px; summary { cursor: pointer; font-size: 12px; } p { white-space: pre-wrap; line-height: 1.8; max-height: 260px; overflow-y: auto; } }
@media (max-width: 1100px) { .writingColumns { grid-template-columns: minmax(0, 1fr) 260px; gap: 14px; }.comicStudio .boardWorkspace { grid-template-columns: 150px minmax(0, 1fr); .storyboardRow { padding: 14px; gap: 12px; } } }
@media (max-width: 800px) { .writingColumns { grid-template-columns: 1fr; }.comicStudio .boardWorkspace { grid-template-columns: 1fr; .boardRail { display: flex; overflow-x: auto; > button { min-width: 130px; max-width: 160px; } .boardRailTitle { min-width: 90px; flex-direction: column; justify-content: center; } } .storyboardRow { grid-template-columns: 1fr; .storyboardDialogue { grid-column: 1; } } }.productionHeader { flex-wrap: wrap; } }

.comicStudio .assetsStage { gap: 12px; .artNavigation { margin: 0; } .artBindingDetails { border: 1px solid var(--studioLine); border-radius: 8px; padding: 10px 14px; summary { cursor: pointer; font-size: 12px; color: var(--studioMuted); } .castingOverview { margin-top: 12px; } } .modelDisclosure { padding: 12px 16px; summary { font-size: 12px; cursor: pointer; } } }
.frameNavigator { display: flex; align-items: center; gap: 8px; h3 { flex: 1; margin: 0 !important; } }
.batchControl { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; background: #edf3e7; border-radius: 10px; margin: 12px 0; font-size: 13px; }
.productionEmpty { text-align: center; padding: 40px; }
</style>
