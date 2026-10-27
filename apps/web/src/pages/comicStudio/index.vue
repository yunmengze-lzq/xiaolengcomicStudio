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
            <button v-for="(item, index) in stages" :key="item.title" :class="{ active: workspaceMode === 'studio' && stage === index }" :aria-current="workspaceMode === 'studio' && stage === index ? 'page' : undefined" :aria-label="`${String(index + 1).padStart(2, '0')} ${item.title}${stageComplete(index) ? '，已完成' : ''}`" :disabled="!project || !!busy" @click="workspaceMode = 'studio'; stage = index">
              <component :is="item.icon" :size="18" stroke="1.7" class="navIcon" aria-hidden="true" />
              <span class="navText">{{ item.title }}</span>
              <span class="stageNumber" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
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

          <div class="pageHeading">
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

          <div v-if="episode && stage > 0" class="productionStatus" aria-label="本期制作状态">
            <button @click="stage = 1">{{ episode.story ? '✓' : '○' }} 故事脚本</button>
            <button @click="stage = 3">{{ episode.styleSnapshot ? '✓' : '○' }} 美术风格 · {{ episode.castSnapshot.length }} 位角色</button>
            <button @click="stage = 4">{{ episode.panels.filter((panel) => panel.image).length }} / {{ episode.panels.length }} 格出图</button>
            <button @click="stage = 6">{{ approvedCount }} / {{ episode.panels.length }} 格审稿</button>
          </div>
          <div v-if="generationProgress.active" class="generationStatus" role="status" aria-live="polite"><strong>{{ generationProgress.phase }}</strong><span>{{ generationProgress.model }} · 已用 {{ generationProgress.elapsedSeconds }} 秒</span><progress aria-label="图片生成处理中"></progress><small>模型未提供精确百分比；完成后会保存图片。重画结果先与旧版对比，再由你选择。</small></div>
          <fieldset class="stageFields" :disabled="!!busy || saving">
            <section v-if="stage === 0" class="topicsStage">
              <div class="creationSummary"><span>{{ activeStyle ? `画风：${activeStyle.name}` : '尚未选择画风' }} · 角色 {{ project.characters.length }} 位</span><button class="secondaryButton" @click="stage = 3">选择角色与画风</button></div>
              <div class="ideaModes" aria-label="创作起点"><button v-for="item in [{ id: 'ownStory', label: '我的剧情' }, { id: 'hot', label: '发现热点' }, { id: 'research', label: '专题研究' }, { id: 'series', label: '原创与连载' }]" :key="item.id" :class="{ selected: ideaMode === item.id }" :aria-pressed="ideaMode === item.id" @click="ideaMode = item.id">{{ item.label }}</button></div>
              <div v-if="ideaMode === 'ownStory'" class="surface"><h2>把自己的剧情变成漫画</h2><label for="ownStory">粘贴剧情或导入文字文件</label><textarea id="ownStory" v-model="originalStory" rows="10" maxlength="10000" placeholder="直接粘贴自己的故事、对话或已写好的分镜，不用先选热点。"></textarea><label class="secondaryButton uploadButton" tabindex="0" role="button" @keydown.enter.prevent="activateUpload" @keydown.space.prevent="activateUpload">导入 TXT / Markdown<input type="file" accept=".txt,.md,text/plain,text/markdown" @change="importStory" /></label><label for="ownCastMode">角色方式</label><select id="ownCastMode" v-model="originalCastMode"><option value="new">根据剧情建立新角色</option><option value="fixed" :disabled="!project.characters.length">使用固定角色</option></select><div v-if="originalCastMode === 'fixed'" class="inlineFields"><label v-for="character in project.characters" :key="character.id" class="checkLabel"><input v-model="originalCharacterIds" type="checkbox" :value="character.id" />{{ character.name }}</label></div><button class="primaryButton" :disabled="!originalStory.trim() || (originalCastMode === 'fixed' && !originalCharacterIds.length)" @click="run('保存自带剧情', () => startFromStory(originalStory, originalCastMode === 'fixed', originalCastMode === 'fixed' ? originalCharacterIds : undefined))">保存剧情，进入脚本与分镜</button><p class="helperText">这里只保存，不调用模型。下一步可继续编辑，按需拆成分镜。</p></div>
              <div v-if="ideaMode === 'series'" class="surface"><h2>创作新漫画</h2><p class="helperText">先建立角色、保存设定图，再选这些角色写故事；下一集会继承角色快照。</p><button class="secondaryButton" @click="stage = 3">先创建固定角色</button><label for="studioOriginal">生活观察或关键词</label><input id="studioOriginal" v-model="originalDirection" maxlength="3500" placeholder="例如：下班后只想安静的 I 人，和热情的同事" /><label for="originalCastMode">角色方式</label><select id="originalCastMode" v-model="originalCastMode"><option value="new">先创作故事，AI 建立新角色</option><option value="fixed" :disabled="!project.characters.length">使用固定角色库 · {{ project.characters.length }} 位</option></select><div v-if="originalCastMode === 'fixed'" class="inlineFields"><label v-for="character in project.characters" :key="character.id" class="checkLabel"><input v-model="originalCharacterIds" type="checkbox" :value="character.id" />{{ character.name }}</label></div><button class="primaryButton" :disabled="!originalDirection.trim() || (originalCastMode === 'fixed' && !originalCharacterIds.length)" @click="run('创建原创选题', () => startOriginal(originalDirection, originalCastMode === 'fixed', originalCastMode === 'fixed' ? originalCharacterIds : undefined))">{{ originalCastMode === 'fixed' ? '使用所选角色开始创作' : '先写故事，建立角色' }}</button></div>
              <seriesDesk v-if="ideaMode === 'series'" :project="project" :disabled="!!busy || saving" @save="run('保存连载设定', save)" @select="(id) => run('切换连载作品', async () => { project!.activeEpisodeId = id; await save(); })" @next="(direction) => run('创建下一集', () => startNextEpisode(direction))" />
              <researchDesk v-if="ideaMode === 'research'" v-model:keyword="researchKeyword" :project="project" :disabled="!!busy || saving" :status="researchStatus" @collect="(keyword, platforms) => run('多平台收集专题素材', () => collectResearch(keyword, platforms))" @save="run('保存研究笔记', save)" @use="(id) => run('采用专题素材包', () => useResearchPack(id))" @detail="(packId, topicId) => run('读取笔记正文', () => readResearchSource(packId, topicId))" />

              <template v-if="ideaMode === 'hot'">
              <div class="sourceIntro">
                <div>找梗 → 选方向 → 写漫画</div>
                <button class="textButton" @click="connectionsVisible = true">{{ source === 'xhsLocal' ? (xhsConnected ? '小红书已连接 · 管理' : '小红书需要登录 · 去连接') : '查看平台接入方式' }}</button>
              </div>
              <div class="toolbar">
                <div class="inlineFields">
                  <label for="sourceSelect">从哪里找</label>
                  <select id="sourceSelect" v-model="source">
                    <option value="bilibili">B站 · 公开热搜词（免登录）</option>
                    <option value="douyin">抖音 · 公开热榜（免登录）</option>
                    <option value="xhsLocal">小红书 · 搜索高赞笔记（需登录）</option>
                    <option value="tieba">弱智吧 · 公开帖子（可能需本人验证）</option>
                    <option value="douban">豆瓣 · 讨论精选（公开列表）</option>
                    <option value="ithome">科技资讯 · IT之家</option>
                    <option value="solidot">科技资讯 · Solidot</option>
                  </select>
                  <button v-if="['douyin', 'bilibili', 'xhsLocal'].includes(source)" class="primaryButton" @click="source === 'xhsLocal' && !xhsConnected ? connectionsVisible = true : run('收集并分析剧情梗…', discoverMemes)">
                    <icon-sparkles :size="16" />
                    {{ source === 'xhsLocal' && !xhsConnected ? '先连接小红书' : '发现剧情梗' }}
                  </button>
                  <button v-else class="primaryButton" @click="run('获取科技资讯', refreshTopics)">获取话题列表</button>
                  <button class="secondaryButton" @click="run('获取热点关键词', refreshTopics)">只收集关键词</button>
                </div>
                <button class="secondaryButton" @click="topicVisible = true">
                  <icon-link :size="16" />
                  添加话题与来源
                </button>
              </div>
              <div v-if="source === 'xhsLocal'" class="searchRow">
                <label for="searchKeyword">想找哪类故事</label>
                <input id="searchKeyword" v-model="searchKeyword" maxlength="80" placeholder="职场、情侣、MBTI、生活科普……" />
                <span class="helperText">搜索最近一天、按点赞排序的笔记。</span>
              </div>
              <p class="helperText" role="status">{{ sourceMessage || (source === 'douyin' ? '公开热榜提供热门线索；系统会据此提出原创剧情，原梗细节需看来源核对。' : '找到喜欢的题材后，选择一个方向开始制作。') }}</p>
              <div v-if="project.episodes.length" class="episodeStrip">
                <span>继续已有作品</span>
                <button v-for="item in project.episodes" :key="item.id" :class="{ selected: episode?.id === item.id }" @click="project.activeEpisodeId = item.id; stage = 1;">{{ item.title }}</button>
              </div>
              <section v-if="project.memeIdeas.length" class="surface">
                <div class="sectionTitle">
                  <h2>剧情梗候选</h2>
                  <span>按改编潜力推荐</span>
                </div>
                <p class="helperText">
                  以下开场、冲突和反转均为原创改编提案。来源通常只有热搜标题，原梗玩法需另行核对；热度是平台原值，与改编潜力分开判断。
                </p>
                <div class="topicGrid">
                  <article v-for="idea in project.memeIdeas" :key="idea.topicId" class="topicCard">
                    <span class="sourceTag">{{ idea.theme }}</span>
                    <h2>{{ idea.hook }}</h2>
                    <p>
                      <strong>开场：</strong>
                      {{ idea.setup }}
                    </p>
                    <p>
                      <strong>冲突：</strong>
                      {{ idea.conflict }}
                    </p>
                    <p>
                      <strong>反转：</strong>
                      {{ idea.twist }}
                    </p>
                    <p class="helperText">待核对：{{ idea.verification }}</p>
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
                      <button class="textButton" @click="researchTopic(idea.hook)">多平台研究这个梗</button><button class="textButton" @click="run('采用剧情梗', () => selectMeme(idea))">
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
                    <button class="textButton" @click="originalDirection = [originalDirection, topic.title].filter(Boolean).join('；').slice(0, 3500)">加入原创关键词</button>
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

            <section v-else-if="stage === 1 && episode" class="splitColumns scriptWorkspace">
              <div class="surface scriptToolbar">
                <div class="scriptModel"><strong>{{ textMode === 'codex' ? `Codex · ${codexModel || 'CLI 默认模型'}` : textModels.find((item) => `${item.providerId}/${item.modelId}` === textModel)?.label || '尚未选择文本模型' }}</strong><span>{{ textMode === 'codex' ? '通过本机命令行联网调用；不是离线本地模型' : '使用设置中选择的云端 API 或本地服务' }}</span></div>
                <div class="scriptActions"><button class="secondaryButton" @click="openSettings('comicDefaults')">更换 / 配置模型</button><button class="primaryButton" @click="requestStory"><icon-sparkles :size="16" />{{ busy ? '生成中，请稍候…' : episode.sourceStory ? '把我的剧情拆成分镜' : '生成脚本与分镜' }}</button></div>
                <p v-if="!episode.topic.verified" class="scriptNotice">{{ hasOnlyTopicClue ? '当前只有热点标题，没有原始正文。可以借关键词写原创故事，或先收集素材。' : '来源尚未核对。可以先补充素材，或选择只借关键词写原创故事。' }}<button class="textButton" @click="useTopicAsInspiration">借这个关键词写原创</button><button class="textButton" @click="researchTopic(episode.topic.title); stage = 0">查找相关素材</button></p>
                <p v-else class="scriptNotice">{{ isOriginalEpisode ? '原创虚构：来源只作灵感，不复述原视频或编造新闻事实。' : '来源已核对，生成时会使用右侧素材摘要。' }}</p>
                <p v-if="scriptIssue" class="scriptIssue" role="alert">{{ scriptIssue }}</p>
              </div>
              <div class="surface">
                <div class="sectionTitle">
                  <h2>故事脚本</h2>
                  <span>可编辑</span>
                </div>
                <label for="episodeTitle">本期标题</label>
                <input id="episodeTitle" v-model="episode.title" maxlength="200" />
                <label for="direction">创作方向</label>
                <textarea id="direction" v-model="episode.direction" rows="3"></textarea>
                <label for="story">故事正文</label>
                <textarea
                  id="story"
                  v-model="episode.story"
                  class="storyEditor"
                  rows="10"
                  placeholder="写下故事，或使用上方按钮生成脚本与分镜。"></textarea>
              </div>
              <aside class="contextColumn">
                <div class="surface">
                  <h2>{{ isOriginalEpisode ? "灵感与参考" : "来源素材" }}</h2>
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
                </div>
                <div class="surface noteCard">
                  <h2>本期制作设定</h2>
                  <p>美术：{{ episode.styleSnapshot?.name || "尚未绑定" }}</p>
                  <p>角色：{{ episode.castSnapshot.map((item) => item.name).join("、") || "尚未设置" }}</p>
                  <button class="textButton" @click="stage = 3">
                    前往角色与美术
                    <icon-arrow-right :size="15" />
                  </button>
                  <small>文本与生图分别配置。可以先写故事，再绑定固定角色和画风，最后逐格出图。</small>
                </div>
              </aside>
            </section>

            <section v-else-if="stage === 2 && episode">
              <div class="toolbar">
                <span class="countLabel">{{ episode.panels.length }} 个分格 · 按阅读顺序排列</span>
                <button class="secondaryButton" @click="episode.panels.push(newPanel())">
                  <icon-plus :size="16" />
                  新增分格
                </button>
              </div>
              <div class="storyboardList">
                <article v-for="(panel, index) in episode.panels" :key="panel.id" class="storyboardRow">
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
                    <label :for="`shot${index}`">景别</label>
                    <input :id="`shot${index}`" v-model="panel.shot" />
                    <label :for="`action${index}`">画面与动作</label>
                    <textarea :id="`action${index}`" v-model="panel.action" rows="3"></textarea>
                    <div class="characterChecks">
                      <label v-for="character in episode.castSnapshot" :key="character.id" class="checkLabel">
                        <input v-model="panel.characters" type="checkbox" :value="character.id" />
                        {{ character.name }}
                      </label>
                    </div>
                    <div v-for="person in episode.castSnapshot.filter((item) => panel.characters.includes(item.id))" :key="person.id" class="actingEditor"><strong>{{ person.name }} · 本格表演</strong><button v-if="!panel.performances.some((item) => item.characterId === person.id)" class="secondaryButton" @click="panel.performances.push({ characterId: person.id, emotion: '', expression: '', pose: '', thought: '' })">添加情绪与动作</button><template v-for="acting in panel.performances.filter((item) => item.characterId === person.id)" :key="acting.characterId"><label :for="`emotion${panel.id}${person.id}`">情绪</label><input :id="`emotion${panel.id}${person.id}`" v-model="acting.emotion" maxlength="300" placeholder="惊喜、失落、强忍笑意……" /><label :for="`expression${panel.id}${person.id}`">眼眉嘴的表情</label><input :id="`expression${panel.id}${person.id}`" v-model="acting.expression" maxlength="500" placeholder="眼睛睁大，眉毛上扬，嘴巴微张" /><label :for="`pose${panel.id}${person.id}`">肢体、视线与动作</label><input :id="`pose${panel.id}${person.id}`" v-model="acting.pose" maxlength="500" /><label :for="`thought${panel.id}${person.id}`">内心独白 · 排版页可添加为心声气泡</label><textarea :id="`thought${panel.id}${person.id}`" v-model="acting.thought" maxlength="600" rows="2"></textarea></template></div>
                  </div>
                  <div class="storyboardDialogue">
                    <label :for="`dialogue${index}`">对白</label>
                    <textarea :id="`dialogue${index}`" v-model="panel.dialogue" @input="panel.speech = splitDialogue(panel, episode.castSnapshot)" rows="3" maxlength="600"></textarea>
                    <label :for="`caption${index}`">旁白</label>
                    <textarea :id="`caption${index}`" v-model="panel.caption" rows="2" maxlength="300"></textarea>
                    <label :for="`sfx${index}`">拟声词 / 音效字</label>
                    <input :id="`sfx${index}`" v-model="panel.sfx" maxlength="40" placeholder="叮—— / 咚咚 / 喵" />
                  </div>
                </article>
              </div>
            </section>

            <section v-else-if="stage === 3" class="assetsStage">
              <div class="artNavigation" role="tablist" aria-label="角色与美术工作区"><button role="tab" :aria-selected="artTab === 'characters'" :class="{ selected: artTab === 'characters' }" @click="artTab = 'characters'">1 · 角色档案</button><button role="tab" :aria-selected="artTab === 'styles'" :class="{ selected: artTab === 'styles' }" @click="artTab = 'styles'">2 · 全篇画风</button></div>
              <p class="helperText">先确认角色外形与性格，再统一画风。出图前自动同步本期已选角色；同名与别名唯一匹配，已有图片保留为旧版供审核。</p>
              <details class="surface modelDisclosure"><summary>出图与图片分析设置 · {{ imageModels.find((item) => `${item.providerId}/${item.modelId}` === imageModel)?.label || '未选择服务' }}</summary><h2>本次设计使用的模型</h2><label for="referenceAnalysisMode">图片分析服务</label><select id="referenceAnalysisMode" v-model="referenceAnalysisMode"><option value="selected">当前文本模型 · 必须支持图片输入</option><option value="codex">Codex · 需已安装并登录，单独用于识图</option></select><p class="helperText">{{ referenceAnalysisMode === 'codex' ? '分析通过 Codex CLI 联网，使用当前账号额度；不会改变编剧模型。' : `当前：${textMode === 'codex' ? 'Codex CLI' : textModels.find((item) => `${item.providerId}/${item.modelId}` === textModel)?.label || '尚未配置文本模型'}。纯文本模型不能分析图片，可改选 Codex 或更换支持识图的文本模型。` }}</p><label for="designImageModel">设计出图服务 · 角色与画风共用</label><select id="designImageModel" v-model="imageModel"><option value="">请选择已配置的生图服务</option><option v-for="model in imageModels.filter((item) => item.configured)" :key="model.providerId + model.modelId" :value="`${model.providerId}/${model.modelId}`">{{ model.label }}</option></select><template v-if="imageModel === 'zImage/turbo4bit'"><label for="designQuality">本地设计画质</label><select id="designQuality" v-model="zImageQuality"><option value="draft">草稿 · 384×512，仅验证通路</option><option value="standard">标准 · 768×1024</option><option value="detail">细节 · 896×1152，较慢</option></select><p class="helperText">普通图生图无法锁定身份。复杂角色建议先做单人立绘；严格保持多角色需要配置含身份参考约束的 ComfyUI 工作流或支持角色参考的 API，单纯增加提示词不能保证。</p></template><div class="panelActions"><button class="secondaryButton" @click="openSettings('mediaModel')">添加在线图片 API / ComfyUI</button><button class="secondaryButton" @click="openSettings('comicLocal')">检测本地模型</button></div><p class="helperText">分析和出图是两次独立操作，点击才调用。图像分析结果先确认和修改，再生成角色或画风样张。</p></details>
              <template v-if="artTab === 'styles'">
              <div class="surface">
                <div class="sectionTitle"><h2>先选一种画风</h2><span>可保存并复用自己的风格</span></div>
                <button class="secondaryButton" @click="applyPreset(dailyAnimeStyle)">应用生活日漫四格 · 正常动漫比例与表情戏</button>
                <p class="helperText">此预设统一角色设计、分镜与出图要求，并设置每页四格；不会重画已有图片。已有Q版角色需先生成并确认新版正常比例角色图，再用于固定角色创作。</p>
                <p class="helperText">点击卡片即可保存并应用到本期，之后可在下方自定义新版本。这些是预设展示样张，不是本次为你生成的图片。选择只载入画风设置；参考原图、分析结果与生成成品会分别标明。</p>
                <div class="presetGrid">
                  <article v-for="preset in stylePresets" :key="preset.id" class="presetCard">
                    <button :aria-label="`选择${preset.name}画风`" @click="applyPreset(preset)">
                      <span class="presetArt" :style="{ backgroundImage: 'url(/styleExamples/styleSheet.png)', backgroundPosition: `${(stylePresets.indexOf(preset) % 3) * 50}% ${Math.floor(stylePresets.indexOf(preset) / 3) * 100}%` }" role="img" :aria-label="`${preset.name}原创AI样张`"></span>
                      <strong>{{ preset.name }}</strong><small>{{ preset.tag }}</small>
                    </button>
                    <a :href="preset.url" target="_blank" rel="noopener noreferrer">查看风格参考 ↗</a>
                  </article>
                </div>
              </div>
              <details class="surface"><summary>更多画风案例与提示词 · 可选</summary><p class="helperText">外链案例图片 © 2025 @jamez-bondos，<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；保留作者与原始链接。案例供学习表达方法；采用前仍需检查具体内容的权利。</p><div class="presetGrid"><article v-for="example in githubStyles" :key="example.id" class="presetCard"><a :href="example.url" target="_blank" rel="noopener noreferrer"><img class="githubArt" :src="example.image" :alt="example.name" loading="lazy" referrerpolicy="no-referrer" />{{ example.name }} · 查看原图与原提示词 ↗</a><p class="helperText">{{ example.credit }}</p><details><summary>查看改编后的漫画画风提示词</summary><p>{{ example.prompt }}</p></details><button class="secondaryButton" @click="applyGithubStyle(example)">用于画风草稿</button></article></div><a href="https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts" target="_blank" rel="noopener noreferrer">更多提示词案例：ImgEdify（合集 MIT）↗</a></details>
              <div class="surface">
                <div class="sectionTitle">
                  <h2>美术风格库</h2>
                  <span>{{ project.styles.length }} 个不可覆盖的版本</span>
                </div>
                <div class="styleVersions">
                  <button
                    v-for="(style, index) in project.styles"
                    :key="style.id"
                    :class="{ selected: project.activeStyleId === style.id }"
                    @click="project.activeStyleId = style.id">
                    <span class="versionNumber">V{{ index + 1 }}</span>
                    <strong>{{ style.name }}</strong>
                    <small>{{ formatTime(style.createdAt) }}</small>
                    <span v-if="project.activeStyleId === style.id" class="statusTag">新作品默认</span>
                  </button>
                </div>
                <details class="styleDraft" open><summary>自定义画风 · 参考图为主，文字只补充感觉</summary>
                  <div class="twoFields">
                    <div>
                      <label for="styleName">版本名称</label>
                      <input id="styleName" v-model="styleDraft.name" maxlength="100" />
                    </div>
                    <div>
                      <label for="styleAvoid">避免出现的效果</label>
                      <input id="styleAvoid" v-model="styleDraft.avoid" />
                    </div>
                  </div>
                  <label for="styleDescription">你希望是什么感觉？</label>
                  <label for="styleReferenceIntent">参考图怎么用？</label><select id="styleReferenceIntent" v-model="styleDraft.referenceIntent"><option value="redesign">提取元素重新设计 · 新人物与新构图</option><option value="identity">保持角色 · 换画风或镜头</option><option value="style">只参考画风 · 不复制原人物</option></select>
                  <textarea
                    id="styleDescription"
                    v-model="styleDraft.description"
                    rows="3"
                    placeholder="例如：像参考图一样的二次元画风，蓝白配色，人物更可爱一些；也可以只上传参考图。"></textarea>
                  <label>风格参考图片</label><label>复用素材库图片<select @change="reuseReference($event, styleDraft.refs, 30)"><option value="">从本空间素材库选择，不重复保存文件</option><option v-for="asset in project.assets.filter((item) => !item.trashedAt)" :key="asset.path" :value="asset.path">{{ asset.source || '本机图片' }} · {{ asset.path }}</option></select></label>
                  <div class="referenceGrid">
                    <figure v-for="reference in styleDraft.refs" :key="reference.id">
                      <img :src="imageUrls[reference.path]" alt="风格参考图片" /><figcaption>{{ reference.source === '自定义 AI 生成' ? '已生成样张 · 可复用' : '参考原图 · 不是生成结果' }}</figcaption>
                      <input v-model="reference.source" aria-label="参考图来源" placeholder="来源链接或作者" />
                      <input v-model="reference.license" aria-label="参考图授权" placeholder="授权依据与允许用途" />
                      <input v-model="reference.note" aria-label="参考图特点" placeholder="希望参考的具体特点" />
                      <button class="textButton" @click="styleDraft.refs = styleDraft.refs.filter((item) => item.id !== reference.id)">移除此参考</button>
                    </figure>
                    <label
                      class="uploadTile"
                      tabindex="0"
                      role="button"
                      @keydown.enter.prevent="activateUpload"
                      @keydown.space.prevent="activateUpload">
                      <icon-photo-plus :size="24" />
                      <span>收集参考图片</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple @change="addStyleReferences" />
                    </label>
                  </div>
                  <button class="secondaryButton" :disabled="!styleDraft.refs.length" @click="run('分析画风参考图', () => analyzeReferences(styleDraft, 'style'))">可选 · 分析参考图（不分析也可直接生成）</button><label for="styleAnalysis">提取的元素与画风 · 可修改（辅助说明）</label><textarea id="styleAnalysis" v-model="styleDraft.referenceAnalysis" rows="4" maxlength="3000" placeholder="可选：分析后显示提取结果，方便检查；参考图仍会直接参与生成。"></textarea>
                  <button class="secondaryButton" :disabled="!imageModel || !referenceReady(styleDraft)" @click="run('生成自定义画风样张', generateStylePreview)">根据参考图与描述生成画风样张</button>
                  <p class="helperText">图像为主：参考图会直接作为生图条件；文字只补充“想要什么感觉”。分析是可选辅助，不再是生成前必须通过的步骤。Z-Image 纯文字路径会丢弃部分参考图，需单独确认。</p>
                  <button class="primaryButton" @click="run('保存新美术版本', publishDraft)">
                    <icon-stack-2 :size="16" />
                    保存为新版本
                  </button>
                </details>
              </div>
              </template>
              <div v-if="artTab === 'characters'" class="surface">
                <div class="sectionTitle">
                  <h2>固定角色库 · {{ project.characters.length }} 位</h2><button class="secondaryButton" @click="run('保存角色库', save)">保存角色</button>
                  <button class="textButton" @click="addCharacter">
                    <icon-plus :size="16" />
                    新增角色
                  </button>
                </div>
                <p class="helperText">图像为主：先上传/选择参考图，文字只补充身份、服装和画风。每个角色只维护一份档案；正式角色图交给生图模型，多参考与身份约束取决于所选服务。</p>
                <div class="characterPicker" aria-label="选择编辑角色"><button v-for="person in project.characters" :key="person.id" :class="{ selected: selectedCharacterId === person.id || !selectedCharacterId && person.id === project?.characters[0]?.id }" @click="selectedCharacterId = person.id"><img v-if="person.image" :src="imageUrls[person.image]" alt="" /><span>{{ person.name }}</span><small>{{ person.image ? '已有正式图' : '待设置形象' }}</small></button></div>
                <div class="characterGrid">
                  <article v-for="character in project.characters.filter((item) => item.id === selectedCharacterId || !selectedCharacterId && item.id === project?.characters[0]?.id)" :key="character.id" class="characterCard">
                    <div class="characterImage">
                      <img v-if="character.image" :src="imageUrls[character.image]" :alt="`${character.name}角色设定`" />
                      <span v-else>
                        <icon-user-square-rounded :size="32" />
                        尚无正式角色图
                      </span>
                    </div>
                    <div v-if="character.designImages.length" class="referenceGrid"><figure v-for="design in character.designImages.slice(-6)" :key="design.path"><img :src="imageUrls[design.path]" :alt="`${character.name}的${design.view}设计`" /><figcaption>{{ ({ sheet: '设定图', turnaround: '三视图', expressions: '表情图', fullBody: '立绘', portrait: '头像' } as Record<string, string>)[design.view] || design.view }}</figcaption><button class="secondaryButton" :disabled="character.image === design.path" @click="character.image = design.path">{{ character.image === design.path ? '当前正式图' : '采用为正式角色图' }}</button></figure></div><p class="helperText">已有正式图时，新设计先保留在候选中；采用后才用于后续分格。表情图与三视图不会自动替换正式图。</p>
                    <details><summary>已有完成的角色图？直接导入成品</summary><label class="secondaryButton uploadButton" tabindex="0" role="button" @keydown.enter.prevent="activateUpload" @keydown.space.prevent="activateUpload">导入成品 · 不调用模型<input type="file" accept="image/png,image/jpeg,image/webp" :aria-label="`上传${character.name}设定图`" @change="uploadCharacter($event, character)" /></label></details>
                    <p class="helperText">{{ character.image ? (project.assets.find((item) => item.path === character.image)?.method === 'upload' ? '这是直接导入的成品原图。要重新设计，请添加下方参考图后分析生成。' : '已生成的角色成品图') : '填写外形后可直接生成；有参考图时，先分析再重新设计。' }}</p>

                    <label :for="character.id">角色名称</label>
                    <input :id="character.id" v-model="character.name" maxlength="100" />
                    <h3>角色档案 · 编剧和出图共用</h3><label :for="`${character.id}Description`">固定外形 · 发型、物种、服装与识别特征</label>

                    <textarea :id="`${character.id}Description`" v-model="character.description" rows="4" placeholder="例如：想做一个蓝白配色、长发、聪明温柔的 DeepSeek 娘；保留参考图发型，衣服更日常。不需要懂绘画术语。"></textarea>
                    <label :for="`${character.id}Visual`">固定外形摘要 · 用于角色与分格生图</label><textarea :id="`${character.id}Visual`" v-model="character.visualSummary" rows="3" maxlength="1000" :placeholder="characterVisual(character) || '分析图片后会提取；可以自己修改发型、瞳色、服装和配饰。'"></textarea>
                    <label :for="`${character.id}Aliases`">剧情里的别名 · 逗号分隔，自动匹配</label><input :id="`${character.id}Aliases`" v-model="character.aliases" maxlength="500" placeholder="例如：小D，DeepSeek娘" />
                    <div class="twoFields"><div><label :for="`${character.id}Personality`">性格与习惯</label><textarea :id="`${character.id}Personality`" v-model="character.personality" rows="3" maxlength="1500" placeholder="例如：外冷内热，紧张时嘴硬，习惯先观察再行动"></textarea></div><div><label :for="`${character.id}Motivation`">动机与在意的事</label><textarea :id="`${character.id}Motivation`" v-model="character.motivation" rows="3" maxlength="1000" placeholder="例如：想被认可，但不愿轻易示弱"></textarea></div></div>
                    <label :for="`${character.id}Speech`">说话方式 · 用于对白和心理描写</label><textarea :id="`${character.id}Speech`" v-model="character.speechStyle" rows="2" maxlength="1000" placeholder="例如：短句、冷幽默；心里吐槽，嘴上克制"></textarea>
                    <details class="characterDesign" open><summary>参考图为主 · 上传后直接生成；文字只补充设定</summary>
                    <button v-if="character.image && !character.refs.some((item) => item.path === character.image)" class="secondaryButton" @click="run('将已有图用作参考', async () => { if (character.refs.length >= 12) throw new Error('请先移除不需要的参考图'); character.refs.push({ id: newTopicId(), path: character.image, source: '已有角色图', note: '提取元素与画风，按新要求设计角色', license: '' }); await save(); })">将上图作为设计参考 · 不重复保存文件</button>
                    <label :for="`${character.id}Intent`">参考图怎么用？</label><select :id="`${character.id}Intent`" v-model="character.referenceIntent"><option value="redesign">提取元素与画风 · 重新设计我的角色</option><option value="identity">保持角色 · 新动作与新视角</option><option value="style">只参考画风 · 新角色身份</option></select><label :for="`${character.id}Art`">想要的画风</label><select :id="`${character.id}Art`" v-model="character.artDirection"><option value="">跟随当前默认画风</option><option value="原创二次元动漫人物，清晰线条、柔和配色、稳定五官与服装细节">二次元动漫</option><option value="原创Q版可爱人物，圆润比例、清晰轮廓、明快配色">Q版可爱</option><option value="原创水彩绘本，柔和纸纹和浅色晕染，人物特征清晰">柔和绘本</option></select>
                    <label :for="`${character.id}View`">这次生成什么？</label><select :id="`${character.id}View`" v-model="character.designView"><option value="sheet">角色设定图 · 正面、侧面和脸部特写</option><option value="turnaround">角色三视图 · 正面、侧面、背面</option><option value="expressions">表情参考图 · 六种表情</option><option value="fullBody">全身立绘 · 看清服装与造型</option><option value="portrait">头像 · 看清脸部特征</option></select>
                    <label>复用素材库图片<select @change="reuseReference($event, character.refs)"><option value="">从本空间素材库选择，不重复保存文件</option><option v-for="asset in project.assets.filter((item) => !item.trashedAt)" :key="asset.path" :value="asset.path">{{ asset.source || '本机图片' }} · {{ asset.path }}</option></select></label>
                    <div class="referenceGrid"><figure v-for="reference in character.refs" :key="reference.id"><img :src="imageUrls[reference.path]" :alt="`${character.name}的生成参考图`" /><input v-model="reference.note" aria-label="角色参考图特点" placeholder="想保留什么？如发型、衣服、配色" /><input v-model="reference.source" aria-label="角色参考图来源" placeholder="来源或作者（自己审核用）" /><button class="textButton" @click="character.refs = character.refs.filter((item) => item.id !== reference.id)">移除此参考</button></figure><label class="uploadTile" tabindex="0" role="button" @keydown.enter.prevent="activateUpload" @keydown.space.prevent="activateUpload"><icon-photo-plus :size="24" /><span>添加生成参考图</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple :aria-label="`添加${character.name}参考图`" @change="addCharacterReferences($event, character)" /></label></div>
                    <button class="secondaryButton" :disabled="!character.refs.length" @click="run('分析角色参考图', () => analyzeReferences(character, 'character'))">可选 · 分析参考图（不分析也可直接生成）</button><label :for="`${character.id}Analysis`">图片提取与角色设计说明 · 可修改（辅助说明）</label><textarea :id="`${character.id}Analysis`" v-model="character.referenceAnalysis" rows="4" maxlength="3000" placeholder="可选：分析后显示保留元素、画风和设计说明；参考图仍会直接参与生成。"></textarea>
                    <p class="helperText">图像为主：参考图直接作为生成条件；文字只补充身份、动作和画风要求。分析是可选辅助，不再是生成前必须通过的步骤。</p>
                    <details><summary>查看实际角色生成提示词</summary><pre>{{ characterPrompt(character, project.styles.find((item) => item.id === project?.activeStyleId) || { description: '', avoid: '' }, imageModel === 'zImage/turbo4bit') }}</pre></details><div class="panelActions"><button class="primaryButton" :disabled="!!busy || !imageModel || !referenceReady(character)" @click="run('生成角色设定图', () => generateCharacter(character))">直接生成角色设计 · 图像为主</button><button class="secondaryButton" @click="run('导出角色提示词', () => exportCharacter(character))">导出 Codex 角色包</button></div></details>
                  </article>
                </div>
              </div>
              <div v-if="episode" class="bindingBar">
                <div>
                  <strong>本期绑定：{{ episode.styleSnapshot?.name || "尚未绑定" }}</strong>
                  <p>本期已选角色会在下次出图前自动更新；同名或别名唯一匹配后复用正式图与性格。旧图不会自动重画，修改后需重新审稿。</p>
                </div>
                <button class="primaryButton" @click="run('绑定本期设定', bindSettings)">
                  同步设定到本期
                  <icon-arrow-right :size="16" />
                </button>
              </div>
            </section>

            <section v-else-if="stage === 4 && episode">
              <div class="toolbar">
                <div class="inlineFields">
                  <label for="imageModel">图片服务</label>
                  <select id="imageModel" v-model="imageModel">
                    <option value="">选择已配置的图片服务</option>
                    <option v-for="model in imageModels.filter((item) => item.configured)" :disabled="!model.configured" :key="model.providerId + model.modelId" :value="`${model.providerId}/${model.modelId}`">
                      {{ model.label }}
                    </option>
                  </select>
                  <template v-if="['zImage/turbo4bit', 'fluxKlein/klein4bit'].includes(imageModel)"><label for="zImageQuality">本地画质</label><select id="zImageQuality" v-model="zImageQuality"><option value="draft">草稿验证 · 384×512</option><option value="standard">标准清晰 · 768×1024</option><option value="detail">细节优先 · 896×1152 · 较慢</option></select></template><template v-if="imageModel === 'zImage/turbo4bit'"><label for="zImageReferenceMode">本地参考方式</label><select id="zImageReferenceMode" v-model="zImageReferenceMode"><option value="text">按分镜重绘 · 支持单人和多人</option><option value="reference">参考本格旧图 · 修订画面</option></select></template>
                  <button class="secondaryButton" @click="openSettings('comicDefaults')">配置服务</button>
                  <button class="primaryButton" :disabled="!imageModel" @click="run('连续生成待出图', generateMissingPanels)">连续生成待出图</button>
                </div>
                <button class="primaryButton" @click="run('打包 Codex 出图任务', exportCodexTask)">
                  <icon-package-export :size="16" />
                  手动协作：导出任务包
                </button>
              </div>
              <p class="helperText">
                <template v-if="imageModel === 'zImage/turbo4bit'">本地默认把角色外形摘要、性格和分镜动作合成文字后重绘，支持多人。普通图生图会保留设定图布局，所以仅用于明确选择的旧图修订；本地身份一致性仍需审核。</template><template v-else-if="imageModel === 'fluxKlein/klein4bit'">本机多参考编辑会实际读取本格每位角色的正式图，按顺序绑定剧情人物；保留参考图服装和外形，仅改变场景、动作与表情。最多4位角色，生成后仍需对照原图审核。</template><template v-else>直接生成会携带本期画风、固定角色与上一格参考图。Codex 内置生图需联网，使用当前 CLI 账号额度，单格通常需要数分钟。</template>重画先保存候选版，比较后再采用；请检查人物、动作和道具连续性。
              </p>
              <div class="imageGrid">
                <article v-for="(panel, index) in episode.panels" :key="panel.id" class="imageCard">
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
                    <span class="sourceTag">{{ panel.shot }}</span>
                    <p>{{ panel.action }}</p>
                    <details class="generationBrief"><summary>优化提示词与本次修改 · 不调用模型</summary><label :for="`subject${panel.id}`">主要动作执行者</label><select :id="`subject${panel.id}`" v-model="panel.actionSubjectId"><option value="">按分镜描述</option><option v-for="character in episode.castSnapshot.filter((item) => panel.characters.includes(item.id))" :key="character.id" :value="character.id">{{ character.name }}</option></select><label :for="`actionContract${panel.id}`">谁对什么做什么</label><textarea :id="`actionContract${panel.id}`" v-model="panel.actionInstruction" rows="3" maxlength="2000" placeholder="例如：只有橘猫橘子用嘴叼袜子；阿暖在右侧摊开右手，嘴巴闭合。画面只有一人一猫。"></textarea><label :for="`revision${panel.id}`">本次重画要求</label><textarea :id="`revision${panel.id}`" v-model="panel.revisionRequest" rows="2" maxlength="2000" placeholder="指出上一版的错误及应保留的内容。"></textarea><label :for="`exactPrompt${panel.id}`">直接使用自己的生图提示词 · 留空则自动整理</label><textarea :id="`exactPrompt${panel.id}`" v-model="panel.imagePromptOverride" rows="4" maxlength="8000" placeholder="填写后原文提交，不额外拼接或改写；本地模型上限512 tokens，长提示词可能被截断。需要显示的文字请在字幕页添加。"></textarea><details><summary>查看本次实际提交的提示词</summary><pre>{{ imageModel === 'fluxKlein/klein4bit' && !panelGenerationIssue(panel) ? identityPanelInput(episode, panel).prompt : imagePrompt(episode, panel, imageModel !== 'zImage/turbo4bit' || zImageReferenceMode === 'reference', imageModel === 'zImage/turbo4bit' && zImageReferenceMode === 'reference', '', imageModel === 'zImage/turbo4bit') }}</pre></details></details>
                    <p class="helperText">绑定角色：{{ episode.castSnapshot.filter((item) => panel.characters.includes(item.id)).map((item) => scriptRoleNames(episode!).has(item.id) ? `${scriptRoleNames(episode!).get(item.id)} → ${item.name}` : item.name).join('、') || '环境画面' }} · 表情动作在“分镜设计”调整</p><p v-if="panelGenerationIssue(panel)" class="warningText" role="status">{{ panelGenerationIssue(panel) }}</p>
                    <div v-if="panel.candidate" class="candidateNotice"><strong>新版已保存，等待选择</strong><p>当前仍使用旧版；两版都保留在历史中。</p><button class="primaryButton" @click="openPanelComparison(panel)">对比并选择版本</button></div>
                    <span v-if="panel.image && panel.generationFingerprint !== imageInput(episode, panel)" class="warningText">
                      设定已变化，请重画或明确确认沿用此图。
                    </span>
                    <div class="panelActions">
                      <button class="primaryButton" :disabled="!!busy || !!panel.candidate || !!panelGenerationIssue(panel)" @click="run(`生成第 ${index + 1} 格…`, async () => { await generatePanel(panel); if (panel.candidate) openPanelComparison(panel); })">
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
                    </div>
                    <div v-if="panel.history.length" class="versionSelect">
                      <label :for="`version${index}`">图片版本</label>
                      <select :id="`version${index}`" :value="panel.image" @change="switchImage($event, panel)">
                        <option v-for="(path, version) in panel.history" :key="path" :value="path">版本 {{ version + 1 }}</option>
                      </select>
                      <button v-if="panel.history.length > 1" class="secondaryButton" @click="openPanelComparison(panel)">对比历史版本</button>
                    </div>
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
            </section>

            <section v-else-if="stage === 5 && episode" class="layoutStage">
              <div class="surface layoutControls">
                <h2>页面与文字</h2>
                <div class="layoutControlGrid">
                  <div><label for="perPage">每页格数</label><select id="perPage" v-model="episode.layout.perPage"><option :value="1">1 格 / 页</option><option :value="2">2 格 / 页</option><option :value="4">4 格 / 页</option></select></div>
                  <div><label for="comicFont">成品字体</label><select id="comicFont" v-model="episode.layout.fontFamily"><option value="sans">清晰黑体 · 系统</option><option value="wenkai">霞鹜文楷 · 内置</option><option value="serif">中文宋体 · 系统</option><option value="genkiGothic">源起黑体 · 内置</option><option value="huninn">粉圆 · 内置</option><option value="genkiMin">源起明体 · 内置</option></select></div>
                  <div><label for="textMode">文字位置</label><select id="textMode" v-model="episode.layout.textMode"><option value="overlay">漫画气泡 · 拖动定位</option><option value="safe">画外留白 · 不遮人物</option></select></div>
                  <div><label for="fontSize">文字字号：{{ episode.layout.fontSize }} px</label><input id="fontSize" v-model.number="episode.layout.fontSize" type="range" min="20" max="60" /></div>
                  <div><label for="pageBackground">页面底色</label><input id="pageBackground" v-model="episode.layout.background" type="color" /></div>
                  <div class="flavorToggle"><label for="comicFlavor"><input id="comicFlavor" v-model="episode.layout.comicFlavor" type="checkbox" /> 漫画质感 · 网点、拟声词、页码</label></div>
                </div>
                <p class="helperText">输出 1080 × 1440 PNG。文字独立排版，修改对白无需重新出图。</p>
                <button class="primaryButton" @click="run('生成排版预览', preview)">
                  <icon-layout :size="16" />
                  刷新排版预览
                </button>
              </div>
              <div class="layoutWorkspace">
                <div class="letteringTabs" aria-label="选择要排字的分格"><button v-for="(panel, index) in episode.panels" :key="panel.id" :class="{ selected: letteringPanel === index }" @click="letteringPanel = index">第 {{ index + 1 }} 格</button></div>
                <div class="letteringRows">
                  <article v-for="(panel, index) in episode.panels" v-show="letteringPanel === index" :key="panel.id" class="surface">
                    <h3>第 {{ index + 1 }} 格 · 文字与位置</h3>
                    <div class="twoFields">
                      <div>
                        <label :for="`letterDialogue${index}`">脚本对白（下方编辑气泡）</label>
                        <textarea :id="`letterDialogue${index}`" v-model="panel.dialogue" :readonly="!!panel.speech.length" rows="2"></textarea>
                      </div>
                      <div>
                        <label :for="`letterCaption${index}`">旁白</label>
                        <textarea :id="`letterCaption${index}`" v-model="panel.caption" rows="2" maxlength="300"></textarea>
                      </div>
                      <div>
                        <label :for="`letterSfx${index}`">拟声词 / 音效字</label>
                        <input :id="`letterSfx${index}`" v-model="panel.sfx" maxlength="40" placeholder="叮—— / 咚咚 / 喵" />
                      </div>
                    </div>
                    <letteringEditor :panel="panel" :cast="episode.castSnapshot" :imageUrl="imageUrls[panel.image]" :textMode="episode.layout.textMode" :fontFamily="episode.layout.fontFamily" />
                  </article>
                </div>
                <div class="pagePreviewColumn"><h3>成品预览</h3><p class="helperText">完整分格与字体已合成，点击图片查看大图。</p><p v-if="previewMessage" class="previewWarning" role="alert">{{ previewMessage }}</p><p v-else-if="!previewUrls.length" class="helperText">图片齐全后自动更新成品预览；修改字号、气泡和排版会实时刷新。</p><div class="pagePreviews"><img v-for="(url, index) in previewUrls" :key="url" :src="url" :alt="`第 ${index + 1} 页排版预览`" tabindex="0" role="button" @click="largePreviewVisible = true" @keydown.enter="largePreviewVisible = true" /></div></div>
              </div>
            </section>

            <section v-else-if="stage === 6 && episode">
              <div class="reviewSummary">
                <div>
                  <strong>
                    {{ approvedCount }}
                    <span>/ {{ episode.panels.length }}</span>
                  </strong>
                  <p>分格通过审阅</p>
                </div>
                <p>逐格检查事实、画面、人物和对白。修改图片、设定、文字或排版后，原审稿结果会失效。</p>
                <button class="secondaryButton" @click="run('刷新成品预览', preview)">查看完整排版</button>
              </div>
              <div class="reviewList">
                <article v-for="(panel, index) in episode.panels" :key="panel.id" class="surface reviewCard">
                  <img v-if="panel.image" :src="imageUrls[panel.image]" :alt="`待审第 ${index + 1} 格`" />
                  <div>
                    <div class="sectionTitle">
                      <h2>第 {{ index + 1 }} 格</h2>
                      <span class="statusTag" :class="{ pending: !isApproved(episode, panel) }">
                        {{ isApproved(episode, panel) ? "已通过" : "待审阅" }}
                      </span>
                    </div>
                    <p>{{ panel.action }}</p>
                    <blockquote>{{ panel.dialogue || panel.caption || "无文字" }}</blockquote>
                    <label :for="`reviewNote${index}`">修改意见</label>
                    <textarea :id="`reviewNote${index}`" v-model="panel.reviewNote" rows="2"></textarea>
                    <div class="panelActions">
                      <button
                        class="primaryButton"
                        :disabled="!panel.image || panel.generationFingerprint !== imageInput(episode, panel) || !episode.topic.verified"
                        @click="approvePanel(panel)">
                        <icon-check :size="16" />
                        通过此格
                      </button>
                      <button class="secondaryButton" @click="stage = 4">返回改图</button>
                      <button class="textButton" @click="panel.approvalFingerprint = ''">撤回通过</button>
                    </div>
                  </div>
                </article>
              </div>
              <div class="pagePreviews"><img v-for="(url, index) in previewUrls" :key="url" :src="url" :alt="`审稿用第 ${index + 1} 页排版`" /></div>
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
                    <dt>审稿状态</dt>
                    <dd>{{ approvedCount }} / {{ episode.panels.length }} 已通过</dd>
                  </div>
                  <div>
                    <dt>美术版本</dt>
                    <dd>{{ episode.styleSnapshot?.name || "尚未绑定" }}</dd>
                  </div>
                </dl>
                <button
                  class="primaryButton"
                  :disabled="!episode.panels.length || approvedCount !== episode.panels.length"
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

          <footer class="stageFooter">
            <button class="textButton" :disabled="stage === 0 || !!busy" @click="stage--">
              <icon-arrow-left :size="16" />
              上一步
            </button>
            <span>{{ stage + 1 }} / {{ stages.length }}</span>
            <button class="primaryButton" :disabled="stage === stages.length - 1 || !!busy || !episode" @click="stage++">
              {{ !episode ? (ideaMode === 'ownStory' ? '先保存自己的剧情' : '从剧情、原创灵感或热点开始') : stage === stages.length - 1 ? '已到最后一步' : `继续：${stages[stage + 1]!.title}` }}
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
      <template #comicDefaults><div class="comicSettings"><div class="settingsLead"><h3>为漫画任务分配模型</h3><p>先在「文本模型 / 生图模型」配置供应商，再在这里选择默认服务。文本与生图互不覆盖；更改自动保存。</p></div><div class="settingColumns"><section class="settingCard"><h3>文本任务</h3><p>选梗、故事脚本、分镜结构、反馈复盘。</p><label for="studioTextMode">运行方式</label><select id="studioTextMode" v-model="textMode" :disabled="modelChecking"><option value="codex">本机 Codex CLI</option><option value="api">云端 / 本地文本 API</option></select><template v-if="textMode === 'codex'"><label for="studioCodexModel">Codex 模型 ID</label><input id="studioCodexModel" v-model="codexModel" :disabled="modelChecking" maxlength="101" /><label for="textEffort">编剧推理强度</label><select id="textEffort" v-model="textEffort"><option value="low">快速</option><option value="medium">均衡</option><option value="high">细致</option><option value="xhigh">深入 · 耗时较长</option></select><p>在本机启动 Codex CLI，通过网络调用模型，并非离线模型。复用 CLI 登录，不修改全局配置。</p></template><template v-else><label for="defaultTextModel">默认文本模型</label><select id="defaultTextModel" v-model="textModel" :disabled="modelChecking"><option value="">请先添加文本模型</option><option v-for="model in textModels" :key="`${model.providerId}/${model.modelId}`" :value="`${model.providerId}/${model.modelId}`">{{ model.label }}</option></select></template><button :disabled="modelChecking || (textMode === 'api' && !textModel)" @click="probeTextModel">{{ modelChecking ? '正在真实调用…' : '测试文本生成' }}</button><p class="modelProbeResult" role="status">{{ modelProbeMessage || '检测会发起一次简短请求，可能产生少量模型费用。' }}</p><button @click="openSettings('languageModel')">管理文本模型</button><button @click="openSettings('comicLocal')">连接本地文本服务</button></section><section class="settingCard"><h3>生图任务</h3><p>角色设定、画风样张、连续分格出图。</p><label for="studioImageModel">默认生图模型</label><select id="studioImageModel" v-model="imageModel"><option value="">尚未选择生图服务</option><option v-for="model in imageModels.filter((item) => item.configured)" :key="`${model.providerId}/${model.modelId}`" :value="`${model.providerId}/${model.modelId}`" :disabled="!model.configured">{{ model.label }}</option></select><p>{{ imageModel === 'fluxKlein/klein4bit' ? '本机多参考编辑，4步；每格读取正式角色图，最多4位角色。请先用草稿验证身份与场景，无云端API费用。' : imageModel === 'zImage/turbo4bit' ? '本机 MLX 推理，默认768×1024、9步；在分格出图可选画质。无云端API费用。支持单参考图，不支持多角色锁定。' : imageModel === 'codex/imagegen' ? '通过已登录的 Codex CLI 直接生图，自动保存回作品。需联网并使用当前账号额度，不需要另填图片 API 密钥。' : imageModel ? '模型已选择；请在分格出图点击生成，验证实际效果。' : '可使用已登录且支持生图的 Codex CLI，或添加图片 API、本地 ComfyUI 工作流。' }}</p><button @click="openSettings('mediaModel')">管理生图模型与工作流</button><button @click="openSettings('comicLocal')">检测本地生图服务</button></section></div><section class="settingCard"><h3>界面与阅读</h3><p>主题、强调色和界面字号统一由原有「界面设置」管理。漫画成品的字号与排字仍在制作流程中设置。</p><button @click="openSettings('ui')">打开界面设置</button></section></div></template>
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
import { stylePresets, githubStyles, dailyAnimeStyle } from "./stylePresets";
import type { StylePreset } from "./stylePresets";
import { imageInput, imagePrompt, identityPanelInput, referenceReady, characterSchema, scriptRoleNames, characterVisual, characterPrompt, reviewInput, isApproved, newPanel, safeLink, splitDialogue, projectSchema, publicationText } from "./model";
import type { Panel, Character, ArtStyle } from "./model";

const newTopicId = () => crypto.randomUUID();
const researchKeyword = ref("");
const ideaMode = ref("hot");
async function researchTopic(keyword: string) { researchKeyword.value = keyword.slice(0, 80); ideaMode.value = "research"; await nextTick(); document.getElementById("researchDesk")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
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
  generateMissingPanels,
  exportCodexTask,
  preview,
  exportPackage,
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
const scriptIssue = ref("");
const isOriginalEpisode = computed(() => ["原创灵感", "专题原创", "原创连载", "原创故事"].includes(episode.value?.topic.source || ""));
const hasOnlyTopicClue = computed(() => episode.value?.topic.kind === "hotSearch" || /热搜线索|不是事实原文|标题与来源/.test(episode.value?.topic.summary || ""));
watch(() => episode.value?.id, () => { scriptIssue.value = ""; });
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
  { title: "角色与美术", icon: IconUserSquareRounded, eyebrow: "ART DIRECTION", heading: "每个故事，都有自己的样子。", description: "收集参考、固定角色，使用可追溯的美术版本。" },
  { title: "分格出图", icon: IconPhoto, eyebrow: "GENERATE", heading: "让分镜，变成看得见的画面。", description: "逐格生成、导入和重画，保留每一次图片版本。" },
  { title: "字幕与排版", icon: IconTypography, eyebrow: "COMPOSE", heading: "让画面和文字，好好说话。", description: "独立编辑对白与旁白，在实际尺寸中调整排版。" },
  { title: "审稿修改", icon: IconChecklist, eyebrow: "REVIEW", heading: "最后一遍，认真看过每一格。", description: "检查画面、角色、事实与文字，逐格确认后再导出。" },
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
const largePreviewVisible = ref(false);
watch(() => episode.value?.id, () => { letteringPanel.value = 0; });
const studioColors = computed(() => ({ "--studioAccent": uiSettings.value.primaryColor, fontSize: `${14 * uiSettings.value.fontScale / 100}px` }));
const artTab = ref<"characters" | "styles">("characters");
const selectedCharacterId = ref("");
watch(() => project.value?.title, () => { selectedCharacterId.value = ""; });
const emptyStyleDraft: NonNullable<typeof project.value>["styleDraft"] = { name: "", description: "", avoid: "", refs: [], referenceIntent: "style", referenceAnalysis: "", analysisFingerprint: "" };
const styleDraft = computed(() => project.value?.styleDraft ?? emptyStyleDraft);

function applyGithubStyle(example: typeof githubStyles[number]) {
  styleDraft.value.name = example.name;
  styleDraft.value.description = `${example.prompt}\n表达方法参考：${example.url}；${example.credit}；改编为原创角色，无可读文字，文字由软件排版。`;
  styleDraft.value.avoid = "既有IP、商标、人物身份漂移、画面内文字";
}

async function applyPreset(preset: StylePreset) {
  await run("应用预设画风", async () => {
    if (!project.value) return;
    let style = project.value.styles.find((item) => item.name === preset.name && item.description === preset.description && item.avoid === preset.avoid && !item.refs.length);
    if (!style) {
      await publishStyle({ name: preset.name, description: preset.description, avoid: preset.avoid, refs: [] });
      style = project.value.styles.find((item) => item.id === project.value!.activeStyleId);
    }
    if (!style) return;
    project.value.activeStyleId = style.id;
    if (episode.value) {
      episode.value.styleSnapshot = structuredClone(JSON.parse(JSON.stringify(style)));
      if (preset.id === "dailyAnime") {
        episode.value.layout.perPage = 4;
        episode.value.layout.background = preset.paper;
        episode.value.layout.textMode = "overlay";
      }
    }
    await save();
    ElMessage.success(`已应用${preset.name}；已有角色图与分格图片保留，请核对画风后再出图`);
  });
}

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
    current.panels.length > 0 && current.panels.every((panel) => panel.image),
    previewUrls.value.length > 0,
    approvedCount.value > 0 && approvedCount.value === current.panels.length,
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
async function addCharacterReferences(event: Event, character: Character) {
  const input = event.target as HTMLInputElement;
  const selected = [...(input.files || [])];
  input.value = "";
  await run("保存角色参考图", async () => {
    if (character.refs.length + selected.length > 12) throw new Error("每位角色最多12张参考图");
    for (const file of selected) character.refs.push({ id: crypto.randomUUID(), path: await putImage(file), source: "", note: "", license: "" });
    await save();
  });
}
async function deleteSpace() {
  if (!project.value) return;
  const confirmed = await ElMessageBox.confirm(`将“${project.value.title}”移到已删除空间？作品文件保留，可恢复。`, "删除空间", { confirmButtonText: "移入已删除", cancelButtonText: "保留空间", type: "warning" }).then(() => true, () => false);
  if (!confirmed) return;
  await archiveSpace();
}
async function addStyleReferences(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = [...(input.files || [])];
  input.value = "";
  await run("收集风格参考图", async () => {
    if (styleDraft.value.refs.length + selected.length > 30) throw new Error("每个画风最多30张参考图");
    for (const file of selected) styleDraft.value.refs.push({ id: crypto.randomUUID(), path: await putImage(file), source: "", note: "", license: "" });
    await save();
  });
}
async function publishDraft() {
  await publishStyle(styleDraft.value);
}
function addCharacter() {
  const character = characterSchema.parse({ id: crypto.randomUUID(), name: "新角色", description: "", image: "" });
  project.value?.characters.push(character);
  selectedCharacterId.value = character.id;
  artTab.value = "characters";
}
function activateUpload(event: KeyboardEvent) {
  (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]')?.click();
}
function uploadCharacter(event: Event, character: Character) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file)
    void run("保存角色设定图", async () => {
      character.image = await putImage(file);
      await save();
    });
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
  .assetsStage .characterGrid { display: block; .characterCard { max-width: 860px; margin: 0 auto; } }
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
      > .characterDesign { order: -1; }
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
</style>
