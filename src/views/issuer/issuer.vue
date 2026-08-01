<template>
	<div class="bp-wrapper" :class="{ 'is-dark': isDark }" v-loading="pageLoading"
		element-loading-background="rgba(0, 0, 0, 0.8)">

		<!-- 全局隐藏的附件上传 Input -->
		<input type="file" ref="hiddenFileInput" style="display: none" @change="handleFileUpload" />
		<!-- 全局隐藏的文档导入 Input -->
		<input type="file" ref="importFileInput" accept=".md,.txt,.log" style="display: none" @change="handleImportFileSelect" />
		<!-- 全局 AI 图片上传 Input -->
		<input type="file" ref="aiImageFileInput" accept="image/*" style="display: none" @change="handleAiImageSelect" />

		<!-- ================= 划选文字 浮动「问 AI」微按钮 ================= -->
		<transition name="el-fade-in-linear">
			<div 
				v-show="aiTooltip.visible" 
				class="ai-selection-tooltip" 
				:style="{ top: aiTooltip.top + 'px', left: aiTooltip.left + 'px' }"
				@mousedown.prevent.stop
				@click="handleAskAiClick"
			>
				<i class="el-icon-cpu"></i> 问 AI
			</div>
		</transition>

		<!-- ================= 1. 毛玻璃 Header ================= -->
		<header class="bp-header">
			<div class="header-left">
				<div class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed"
					:title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
					<i :class="sidebarCollapsed ? 'el-icon-s-unfold' : 'el-icon-s-fold'"></i>
				</div>
				<div class="header-logo">
					<div class="logo-icon-wrapper">
						<i class="el-icon-data-analysis"></i>
					</div>
					<span class="logo-text">Trouble<span class="logo-highlight">Docs</span></span>
				</div>
			</div>

			<div class="header-actions">
				<!-- 导入文档按钮 -->
				<el-tooltip
					:disabled="canAddProblemInCurrentCategory"
					content="他人共享给您的分类目录暂不支持导入文档"
					placement="bottom">
					<span class="btn-tooltip-wrapper">
						<el-button class="export-btn" size="small" icon="el-icon-upload2" plain
							:disabled="!canAddProblemInCurrentCategory"
							@click="triggerImportFile">
							<span class="btn-text">导入文档</span>
						</el-button>
					</span>
				</el-tooltip>

				<!-- 录入文档按钮 -->
				<el-tooltip
					:disabled="canAddProblemInCurrentCategory"
					content="他人共享给您的分类目录暂不支持录入新文档"
					placement="bottom">
					<span class="btn-tooltip-wrapper">
						<el-button class="glow-btn primary-gradient-btn" size="small" icon="el-icon-plus"
							:disabled="!canAddProblemInCurrentCategory"
							@click="openProblemDialog">
							<span class="btn-text">录入文档</span>
						</el-button>
					</span>
				</el-tooltip>

				<div class="divider"></div>
				<div class="theme-btn" @click="toggleTheme" :title="isDark ? '切换到白天模式' : '切换到暗黑深邃模式'">
					<i :class="isDark ? 'el-icon-sunny' : 'el-icon-moon'"></i>
				</div>

				<el-popover placement="bottom-end" width="160" trigger="click" :visible-arrow="false"
					:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
					<div class="action-menu-list">
						<div class="action-item danger" @click="handleUserCommand('logout')">
							<i class="el-icon-switch-button"></i> <span>退出文档</span>
						</div>
					</div>
					<div slot="reference" class="avatar-wrapper">
						<el-avatar class="user-avatar" size="small"
							src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png">
						</el-avatar>
						<span class="login_user">{{ currentUser.username }}</span>	
					</div>
				</el-popover>
			</div>
		</header>

		<!-- 移动端侧边栏遮罩层 -->
		<div v-if="isMobile && !sidebarCollapsed" class="mobile-sidebar-backdrop" @click="sidebarCollapsed = true"></div>

		<!-- ================= 2. 主体区 (Flex 弹性并排) ================= -->
		<div class="bp-body">

			<!-- 左侧边栏 (Sidebar) -->
			<aside class="bp-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
				<div class="sidebar-top-action">
					<el-button class="add-cat-btn" plain size="small" icon="el-icon-folder-add"
						@click="openCategoryDialog" :loading="apiLoading">
						新建问题分类
					</el-button>

					<div class="search-box-wrapper">
						<el-input class="modern-el-input" v-model="searchCategoryQuery" placeholder="搜索分类目录..."
							prefix-icon="el-icon-search" clearable></el-input>
					</div>
				</div>

				<div class="menu-list" v-loading="apiLoading">
					<div class="empty-hint" v-if="filteredCategories.length === 0">
						<i class="el-icon-box"></i>
						<span>暂无匹配分类</span>
					</div>

					<div class="menu-item" v-for="cat in filteredCategories" :key="cat.id"
						:class="{ 'active': activeCategoryId === cat.id }" @click="selectCategory(cat.id)">
						<div class="menu-left">
							<i class="menu-cat-icon"
								:class="activeCategoryId === cat.id ? 'el-icon-folder-opened' : 'el-icon-folder'"></i>
							
							<el-input v-if="editCategoryId === cat.id" :ref="'catInput_' + cat.id" v-model="editCategoryName"
								size="mini" class="category-inline-input" @blur="finishEditCategory(cat)"
								@keyup.enter.native="finishEditCategory(cat)" @click.stop.native></el-input>
							<div v-else class="menu-text-wrapper">
								<span class="menu-text" :title="cat.name">{{ cat.name }}</span>
								
								<el-popover v-if="cat.sharedUsers && cat.sharedUsers.length > 0" placement="right" trigger="hover" width="200"
									:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
									<div class="shared-users-popover-content">
										<div class="popover-sub-title"><i class="el-icon-share"></i> 共享给以下用户 ({{ cat.sharedUsers.length }})</div>
										<div class="shared-user-tag-list">
											<span class="shared-user-badge" v-for="u in cat.sharedUsers" :key="u.id">
												<i class="el-icon-user"></i> {{ u.username }}
											</span>
										</div>
									</div>
									<i slot="reference" class="el-icon-share shared-icon-tag" title="公开共享分类 (移入查看具体共享用户)"></i>
								</el-popover>
								<i v-else-if="cat.is_shared" class="el-icon-share shared-icon-tag" title="公开共享分类"></i>

								<span class="menu-badge" v-if="cat.docCount > 0">{{ cat.docCount }}</span>
							</div>
						</div>

						<el-popover v-if="canManageShare(cat)" :ref="'popover_' + cat.id" placement="right-start" width="200" trigger="click"
							:visible-arrow="false"
							:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
							<div class="action-menu-list">
								<div class="action-item" @click.stop="openShareDialog('category', cat)">
									<i class="el-icon-share"></i> <span>指定共享用户 ({{ cat.sharedUsers ? cat.sharedUsers.length : 0 }})</span>
								</div>
								<div class="action-divider"></div>

								<div class="action-item" @click.stop="handleCategoryCommand('rename', cat)">
									<i class="el-icon-edit"></i> <span>重命名分类</span>
								</div>
								<div class="action-divider"></div>
								<div class="action-item danger" @click.stop="requestDeleteCategory(cat)">
									<i class="el-icon-delete"></i> <span>删除整个分类</span>
								</div>
							</div>
							<div class="menu-more" slot="reference" @click.stop>
								<i class="el-icon-more"></i>
							</div>
						</el-popover>
					</div>
				</div>
			</aside>

			<!-- 右侧阅读工作区 (Main) -->
			<main class="bp-main" ref="mainScrollContainer" @scroll="handleScroll">
				<!-- 右侧锚点轨道 (PC端展示) -->
				<div class="scrollbar-markers-track" v-if="scrollMarkers.length > 0 && !isMobile">
					<el-popover
						v-for="marker in scrollMarkers"
						:key="'marker-' + marker.id"
						placement="left"
						trigger="hover"
						width="260"
						:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'"
					>
						<div class="marker-popover-content">
							<div class="marker-popover-title">
								<i class="el-icon-document"></i>
								<span>{{ marker.title }}</span>
							</div>
							<p class="marker-popover-summary">{{ getPlainSummary(marker.solution) }}</p>
							<div class="marker-popover-tip">
								<i class="el-icon-position"></i> 点击直达本文档位置
							</div>
						</div>
						<div
							slot="reference"
							class="scroll-marker-item"
							:class="{ 'is-active': activeMarkerId === marker.id }"
							:style="{ top: marker.topPercent + '%' }"
							@click.stop="scrollToProblem(marker.id)"
						>
							<span class="marker-dot"></span>
						</div>
					</el-popover>
				</div>

				<div class="main-content-container">

					<div class="main-header">
						<div class="category-meta">
							<div class="category-badge-group">
								<span class="category-badge">当前目录</span>
								<span v-if="currentCategory && currentCategory.creator" class="category-creator-badge" title="目录创建者">
									<i class="el-icon-user"></i> {{ currentCategory.creator.username }} 创建
								</span>
							</div>

							<h1 class="category-title">{{ currentCategoryName }}</h1>
							<p class="category-subtitle">
								共收录 {{ computedTotalProblems }} 个文档
								<span v-if="currentCategory && currentCategory.createdAt">
									· 创建于 {{ currentCategory.createdAt.split('T')[0] }}
								</span>
							</p>
						</div>

						<div class="main-header-actions">
							<div class="search-box-wrapper main-search">
								<el-input class="modern-el-input" v-model="searchProblemInput"
									placeholder="搜索文档 (按Enter或离焦搜索)" prefix-icon="el-icon-search" clearable
									@keyup.enter.native="handleProblemSearch"
									@blur="handleProblemSearch"
									@clear="handleProblemSearch"></el-input>
							</div>

							<transition name="el-fade-in-linear">
								<el-checkbox v-if="isBatchMode && currentProblems.length > 0" class="check-all-box"
									:indeterminate="isIndeterminate" v-model="checkAll">
									本页全选
								</el-checkbox>
							</transition>

							<el-popover ref="exportPopover" placement="bottom-end" width="220" trigger="click"
								:visible-arrow="false"
								:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
								<div class="action-menu-list">
									<div class="action-item" @click="openExportFormatDialog('all')">
										<i class="el-icon-document-copy"></i> <span>导出当前页全量</span>
									</div>
									<div class="action-item" :class="{ 'is-disabled': selectedProblemIds.length === 0 }"
										@click="selectedProblemIds.length > 0 && openExportFormatDialog('selected')">
										<i class="el-icon-finished"></i> <span>导出勾选项 ({{ selectedProblemIds.length }})</span>
									</div>
									<div class="action-divider"></div>
									<div class="action-item" @click="toggleBatchMode"
										:class="{ 'is-active-item': isBatchMode }">
										<i class="el-icon-document-checked"></i> <span>{{ isBatchMode ? '退出自定义跨目录选择' :
											'自定义跨目录选出文档'
										}}</span>
									</div>
								</div>
								<el-button slot="reference" class="export-btn" icon="el-icon-download" plain>
									导出文档 <i class="el-icon-arrow-down el-icon--right"></i>
								</el-button>
							</el-popover>
						</div>
					</div>

					<transition name="toast-slide-down">
						<div v-if="isBatchMode" class="batch-mode-banner">
							<div class="batch-banner-left">
								<i class="el-icon-magic-stick"></i>
								跨目录多选模式已开启。已选中 <strong>{{ selectedProblemIds.length }}</strong> 篇。
							</div>
							<div class="batch-banner-right">
								<el-button size="mini" plain @click="toggleBatchMode">取 消</el-button>
								<el-button size="mini" type="primary" class="primary-gradient-btn"
									@click="openExportFormatDialog('selected')"
									:disabled="selectedProblemIds.length === 0">导出已选项</el-button>
							</div>
						</div>
					</transition>

					<!-- ================= 分类内容过渡包裹层 ================= -->
					<transition name="category-switch" mode="out-in">
						<div class="category-content-body" v-if="isContentVisible" :key="activeCategoryId">

							<!-- 3. 快速故障卡牌导航区 -->
							<div class="card-deck-wrapper" v-if="currentProblems.length > 0" :key="'deck-' + cardDealKey">
								<div class="deck-header">
									<div class="deck-title">
										<i class="el-icon-s-grid"></i>
										<span>目录文档卡牌速查</span>
										<span class="deck-badge">{{ currentProblems.length }} 篇快查</span>
									</div>
									<el-button type="text" class="deck-toggle-btn" @click="showCardOverview = !showCardOverview">
										<i :class="showCardOverview ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
										{{ showCardOverview ? '收起' : '展开' }}
									</el-button>
								</div>

								<transition name="el-zoom-in-top">
									<div class="card-deck-grid" v-show="showCardOverview">
										<div 
											class="deck-card" 
											v-for="(prob, idx) in currentProblems" 
											:key="'deck-item-' + prob.id"
											:style="{ '--card-index': idx }"
											@click="scrollToProblem(prob.id)"
											:title="'点击直达标题位置：' + prob.title"
										>
											<div class="deck-card-top">
												<span class="deck-card-badge">#{{ String(idx + 1).padStart(2, '0') }}</span>
												<h4 class="deck-card-title">{{ prob.title }}</h4>
											</div>
											<p class="deck-card-preview">{{ getPlainSummary(prob.solution) }}</p>
											<div class="deck-card-footer">
												<span class="deck-card-action">点击直达 <i class="el-icon-position"></i></span>
											</div>
										</div>
									</div>
								</transition>
							</div>

							<!-- 4. 空状态提示 -->
							<div class="empty-state" v-if="currentProblems.length === 0">
								<div class="empty-art">
									<i class="el-icon-document-delete"></i>
								</div>
								<h3>{{ searchProblemQuery ? '未找到相关内容' : '此目录还是空的' }}</h3>
								<p v-if="searchProblemQuery">请尝试更换搜索关键词或检查拼写</p>
								<p v-else-if="canAddProblemInCurrentCategory">您可以点击右上角按钮录入第一条文档记录</p>
								<p v-else>当前目录为他人共享知识库，您暂无录入文档权限</p>
							</div>

							<!-- 5. 故障详细列表 -->
							<el-checkbox-group v-model="selectedProblemIds" class="problem-list"
								:class="{ 'is-batch-mode': isBatchMode }" v-else v-loading="apiLoading">

								<div class="problem-item-wrapper" v-for="(prob, index) in paginatedProblems" :key="prob.id">

									<div class="outer-checkbox-wrapper" @click.stop="toggleSingleSelection(prob.id)">
										<el-checkbox class="outer-checkbox" :label="prob.id">{{ "" }}</el-checkbox>
									</div>

									<div 
										:id="'problem-card-' + prob.id"
										class="problem-card" 
										:class="{ 
											'is-selected': selectedProblemIds.includes(prob.id),
											'is-target-highlight': highlightedProblemId === prob.id 
										}"
										@click="isBatchMode && toggleSingleSelection(prob.id)"
									>
										<!-- 卡片 Header -->
										<div class="card-header">
											<div class="card-title-group">
												<div class="index-badge">#{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</div>

												<el-input v-if="editTitleId === prob.id" :ref="'titleInput_' + prob.id"
													v-model="prob.title" size="small" class="inline-edit-input modern-el-input"
													@blur="finishEditTitle(prob)" @keyup.enter.native="finishEditTitle(prob)"
													@click.stop.native></el-input>
												
												<div v-else class="editable-text-wrapper" :class="{ 'is-readonly': !canManageShare(prob) }"
													@click.stop="canManageShare(prob) && startEditTitle(prob.id)">
													<h3 class="editable-text">{{ prob.title }}</h3>
													<i v-if="canManageShare(prob)" class="el-icon-edit edit-icon" title="点击编辑标题"></i>
												</div>
											</div>

											<div class="card-header-actions" @click.stop>
												<span class="update-time"><i class="el-icon-time"></i> {{ prob.updatedAt || '刚刚' }}</span>
												<div class="action-icons">
													<el-button type="text" class="icon-btn" icon="el-icon-download"
														@click.stop="openExportFormatDialog('single', prob)" title="仅导出此文档"></el-button>
													
													<el-button v-if="canManageShare(prob)" type="text" class="card-delete-btn icon-btn"
														icon="el-icon-delete" @click.stop="requestDeleteProblem(prob.id)"
														title="删除记录"></el-button>
												</div>
											</div>
										</div>

										<div class="card-body" @click.stop>
											<!-- 元数据栏 -->
											<div class="doc-meta-bar">
												<div class="meta-item creator" title="文档创建者">
													<i class="el-icon-user-solid"></i>
													<span class="meta-label">创建：</span>
													<span class="meta-value author-name">{{ prob.creator ? prob.creator.username : '未知' }}</span>
												</div>

												<div class="meta-divider"></div>

												<div class="meta-item updater" title="最近更新作者">
													<i class="el-icon-edit-outline"></i>
													<span class="meta-label">最近更新：</span>
													<span class="meta-value updater-name">{{ prob.updatedBy ? prob.updatedBy.username : (prob.creator ? prob.creator.username : '未知') }}</span>
												</div>

												<div class="meta-divider" v-if="prob.editors && prob.editors.length > 0"></div>

												<div class="meta-item editors" v-if="prob.editors && prob.editors.length > 0">
													<i class="el-icon-s-custom"></i>
													<span class="meta-label">贡献者：</span>
													<el-popover placement="top" trigger="hover" width="200"
														:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
														<div class="editors-popover-content">
															<div class="editors-title"><i class="el-icon-user"></i> 编辑参与者列表 ({{ prob.editors.length }})</div>
															<div class="editors-tag-list">
																<span class="editor-chip" v-for="ed in prob.editors" :key="ed.id">
																	<i class="el-icon-check"></i> {{ ed.username }}
																</span>
															</div>
														</div>
														<div slot="reference" class="editors-trigger">
															<span class="editor-badge" v-for="(ed, eIdx) in prob.editors.slice(0, 3)" :key="ed.id">
																{{ ed.username }}{{ eIdx < Math.min(prob.editors.length, 3) - 1 ? '、' : '' }}
															</span>
															<span class="more-count" v-if="prob.editors.length > 3">+{{ prob.editors.length - 3 }}人</span>
														</div>
													</el-popover>
												</div>

												<div class="meta-divider"></div>

												<!-- 共享给指定用户区域 -->
												<div class="meta-item shared-users-meta">
													<i class="el-icon-share"></i>
													<span class="meta-label">共享：</span>
													
													<template v-if="prob.sharedUsers && prob.sharedUsers.length > 0">
														<span class="shared-user-name-chip" v-for="(u, uIdx) in prob.sharedUsers.slice(0, 2)" :key="u.id">
															{{ u.username }}{{ uIdx < Math.min(prob.sharedUsers.length, 2) - 1 ? '、' : '' }}
														</span>

														<el-popover v-if="prob.sharedUsers.length > 2" placement="top" trigger="hover" width="220"
															:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
															<div class="shared-users-popover-content">
																<div class="popover-sub-title"><i class="el-icon-share"></i> 共享文档给以下用户 ({{ prob.sharedUsers.length }})</div>
																<div class="shared-user-tag-list">
																	<span class="shared-user-badge" v-for="u in prob.sharedUsers" :key="u.id">
																		<i class="el-icon-check"></i> {{ u.username }}
																	</span>
																</div>
															</div>
															<span slot="reference" class="more-users-count-tag">+{{ prob.sharedUsers.length - 2 }}人</span>
														</el-popover>
													</template>

													<span v-else class="read-only-share-tag">未指定(仅自己)</span>

													<el-button v-if="canManageShare(prob)" type="text" class="manage-share-btn" icon="el-icon-setting"
														@click.stop="openShareDialog('problem', prob)" title="点击管理或取消共享用户">
														设置
													</el-button>
												</div>

												<div class="meta-version-badge" v-if="prob.version">
													<span>v{{ prob.version }}</span>
												</div>
											</div>

											<!-- ======= 排查思路头部 ======= -->
											<div class="solution-header">
												<div class="solution-header-left">
													<div class="solution-label">
														<i class="el-icon-magic-stick"></i> 排查思路与解决方案
														<span class="md-tag" v-if="isMarkdown(prob.solution)">
															<i class="el-icon-document-checked"></i> MD
														</span>
													</div>

													<transition name="el-fade-in-linear">
														<div class="attachment-group-container" v-if="prob.attachments && prob.attachments.length > 0" style="display: inline-flex; align-items: center; gap: 6px;">
															
															<!-- 主附件（首个附件） -->
															<div 
																class="attachment-badge" 
																@click.stop="previewAttachment(prob.attachments[0], prob)" 
																@contextmenu.prevent.stop="openAttachmentContextMenu(prob.attachments[0], prob, $event)"
																:title="'左键点击直接预览 / 右键操作菜单：' + prob.attachments[0].name"
															>
																<i class="el-icon-document"></i>
																<span class="file-name">{{ prob.attachments[0].name }}</span>
																<span v-if="canManageShare(prob)" class="remove-file-btn" @click.stop="removeAttachment(prob, prob.attachments[0], 0)"
																	title="移除该附件">
																	<i class="el-icon-close"></i>
																</span>
															</div>

															<!-- 更多附件下拉菜单 -->
															<el-dropdown v-if="prob.attachments.length > 1" trigger="click" @click.native.stop>
																<div class="attachment-badge more-attachment-badge" title="查看更多附件">
																	<span>+{{ prob.attachments.length - 1 }} 个附件</span>
																	<i class="el-icon-arrow-down el-icon--right"></i>
																</div>
																<el-dropdown-menu slot="dropdown" :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
																	<el-dropdown-item v-for="(file, fIdx) in prob.attachments.slice(1)" :key="file.id || fIdx">
																		
																		<div 
																			style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 180px;" 
																			@click.stop="previewAttachment(file, prob)"
																			@contextmenu.prevent.stop="openAttachmentContextMenu(file, prob, $event)"
																		>
																			<span style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;" :title="'左键点击直接预览 / 右键操作菜单：' + file.name">
																				<i class="el-icon-document"></i> {{ file.name }}
																			</span>
																			<i v-if="canManageShare(prob)" class="el-icon-close" style="color: #ef4444; cursor: pointer; font-size: 13px;"
																				@click.stop="removeAttachment(prob, file, fIdx + 1)" title="移除此附件"></i>
																		</div>

																	</el-dropdown-item>
																</el-dropdown-menu>
															</el-dropdown>
														</div>
													</transition>
												</div>

												<div class="solution-actions">
													<!-- 编辑文档按钮 -->
													<div class="action-btn" v-if="editSolutionId !== prob.id" @click.stop="startEditSolution(prob.id)">
														<i class="el-icon-edit"></i> <span>编辑文档</span>
													</div>
													<div class="action-btn is-active-item" v-else @click.stop="finishEditSolution(prob)">
														<i class="el-icon-check"></i> <span>保存修改</span>
													</div>

													<!-- SVN 拉取与提交同步按钮 -->
													<el-dropdown trigger="click" @command="(cmd) => handleSvnCommand(cmd, prob)" @click.native.stop>
														<div class="action-btn svn-action-btn">
															<i class="el-icon-refresh"></i> <span>SVN同步</span> <i class="el-icon-arrow-down el-icon--right"></i>
														</div>
														<el-dropdown-menu slot="dropdown" :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
															<el-dropdown-item command="pull">
																<i class="el-icon-download"></i> 拉取最新版本 (SVN Pull)
															</el-dropdown-item>
															<el-dropdown-item command="commit">
																<i class="el-icon-upload2"></i> 提交版本更新 (SVN Commit)
															</el-dropdown-item>
														</el-dropdown-menu>
													</el-dropdown>

													<div class="copy-btn action-btn" v-if="!prob.attachments || prob.attachments.length < 10"
														@click.stop="triggerUpload(prob.id)">
														<i class="el-icon-paperclip"></i> <span>添加附件 {{ (prob.attachments && prob.attachments.length > 0) ? `(${prob.attachments.length}/10)` : '' }}</span>
													</div>

													<div class="copy-btn action-btn" @click.stop="openMoveDialog(prob)" v-if="canManageShare(prob)">
														<i class="el-icon-folder-opened"></i> <span>移动分类</span>
													</div>

													<el-dropdown trigger="click" @command="(cmd) => handleCopyCommand(cmd, prob.solution)" @click.native.stop>
														<div class="copy-btn action-btn">
															<i class="el-icon-document-copy"></i> <span>复制全文</span> <i class="el-icon-arrow-down el-icon--right"></i>
														</div>
														<el-dropdown-menu slot="dropdown" :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
															<el-dropdown-item command="raw">
																<i class="el-icon-document-copy"></i> 复制原文 (保留 MD / 格式)
															</el-dropdown-item>
															<el-dropdown-item command="plain">
																<i class="el-icon-tickets"></i> 复制纯文本 (转换无格式文本)
															</el-dropdown-item>
														</el-dropdown-menu>
													</el-dropdown>
												</div>
											</div>

											<el-input v-if="editSolutionId === prob.id" :ref="'solutionInput_' + prob.id"
												type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" v-model="prob.solution"
												class="inline-edit-textarea modern-el-input" @blur="finishEditSolution(prob)"></el-input>
											
											<div v-else class="solution-code editable-block">
												<div v-if="isMarkdown(prob.solution)" class="markdown-body" v-html="renderMarkdown(prob.solution)"></div>
												<div v-else class="plain-code">{{ prob.solution }}</div>
											</div>
										</div>
									</div>

								</div>
							</el-checkbox-group>

							<!-- 6. 分页栏 -->
							<div class="pagination-wrapper" v-if="computedTotalProblems > 0 || currentProblems.length > 0">
								<el-pagination background 
									@current-change="handleCurrentChange"
									:current-page="currentPage" 
									:page-size="pageSize"
									:layout="isMobile ? 'prev, pager, next' : 'total, prev, pager, next, jumper'" 
									:total="computedTotalProblems">
								</el-pagination>
							</div>

						</div>
					</transition>

				</div>

				<!-- ================= 页面右侧浮动 AI 助手入口悬浮球 ================= -->
				<div class="ai-floating-fab" @click="openAiDialogFromFab" title="AI 智能排错解析助手与历史问答">
					<div class="fab-glow-ring"></div>
					<div class="fab-icon"><i class="el-icon-cpu"></i></div>
					<span class="fab-history-badge" v-if="aiHistory.length > 0">{{ aiHistory.length }}/10</span>
				</div>

				<!-- ================= 快捷一键置顶 / 置底悬浮工具栏 ================= -->
				<transition name="toast-slide-up">
					<div class="quick-scroll-widget" v-show="showScrollButtons">
						<div class="scroll-btn" @click="scrollToTop" title="一键回到顶部">
							<i class="el-icon-caret-top"></i>
						</div>
						<div class="scroll-divider"></div>
						<div class="scroll-btn" @click="scrollToBottom" title="一键直达底部">
							<i class="el-icon-caret-bottom"></i>
						</div>
					</div>
				</transition>
			</main>
		</div>

		<!-- ================= 3. 弹窗区 ================= -->

		<!-- AI 智能问答与历史解析弹窗 (精炼升华版) -->
		<el-dialog 
			v-dialogDrag 
			:visible.sync="aiDialog.visible" 
			:width="dialogWidth" 
			:close-on-click-modal="false" 
			custom-class="modern-dialog ai-dialog-modal"
			@closed="handleAiDialogClose"
		>
			<div slot="title" class="ai-dialog-custom-header">
				<div class="header-title-left">
					<div class="ai-glow-icon"><i class="el-icon-cpu"></i></div>
					<span class="title-text">AI 排错助手</span>
					<span class="ai-model-tag">{{ aiForm.model || 'gemini-1.5-flash' }}</span>
				</div>
				<div class="header-actions-right">
					<!-- 仿 Models/Agents 架构的全新胶囊 Pill 切换器 -->
					<div class="ai-pill-switch">
						<div class="pill-item" :class="{ 'active': aiActiveTab === 'chat' }" @click="aiActiveTab = 'chat'">
							<i class="el-icon-chat-dot-square"></i> 智能追问
						</div>
						<div class="pill-item" :class="{ 'active': aiActiveTab === 'history' }" @click="aiActiveTab = 'history'">
							<i class="el-icon-notebook-2"></i> 历史记录 ({{ aiHistory.length }}/10)
						</div>
					</div>

					<el-tooltip :content="aiDialog.showSettings ? '隐藏配置' : '模型与 Key 配置'" placement="top">
						<el-button size="mini" type="text" class="ai-config-toggle-btn" @click="aiDialog.showSettings = !aiDialog.showSettings">
							<i class="el-icon-setting"></i>
						</el-button>
					</el-tooltip>
				</div>
			</div>

			<!-- AI 模型与 API Key 设置面板 -->
			<transition name="el-zoom-in-top">
				<div v-show="aiDialog.showSettings || !aiForm.apiKey" class="ai-settings-panel">
					<div class="settings-title">
						<i class="el-icon-s-tools"></i> Google Gemini 服务接口配置
						<span class="settings-tip">(已加密保存于本地浏览器)</span>
					</div>
					<el-form size="small" label-position="top">
						<el-form-item label="Gemini API Key">
							<el-input class="modern-el-input" v-model="aiForm.apiKey" type="password" show-password placeholder="请输入您的 API Key (如 AIzaSy...)"></el-input>
						</el-form-item>
						<el-form-item label="AI 模型 Model">
							<el-input class="modern-el-input" v-model="aiForm.model" placeholder="默认: gemini-1.5-flash，也可填写 gemini-3.6-flash 等"></el-input>
						</el-form-item>
						<el-form-item label="提问 Prompt 预设前缀">
							<el-input class="modern-el-input" v-model="aiForm.customPrompt" placeholder="例如: 请帮我分析以下报错/文档，并给出定位思路与解决方案："></el-input>
						</el-form-item>
						<div style="text-align: right; margin-top: 12px;">
							<el-button size="mini" type="primary" class="primary-gradient-btn" icon="el-icon-check" @click="saveAiSettings">保 存 配 置</el-button>
						</div>
					</el-form>
				</div>
			</transition>

			<!-- 视图 1：AI 智能提问 / 对话 / 追问视图 -->
			<div v-show="aiActiveTab === 'chat'" class="ai-chat-view-container">
				<!-- 上下文选中文本预览 -->
				<div v-if="aiDialog.queryText" class="ai-selected-preview">
					<div class="preview-label">
						<i class="el-icon-document-checked"></i> 当前划选解析上下文：
					</div>
					<div class="preview-text">{{ aiDialog.queryText }}</div>
				</div>

				<!-- AI 回复流式展示卡片 -->
				<div class="ai-response-card" :class="{ 'is-streaming': aiDialog.isStreaming }">
					<div class="response-card-header">
						<div class="header-status">
							<span class="status-indicator" :class="{ 'pulse-active': aiDialog.isStreaming }"></span>
							<span class="status-text">{{ aiDialog.isStreaming ? 'AI 正在实时思考生成回答...' : (aiDialog.responseText ? 'AI 解析完成' : 'AI 助手就绪') }}</span>
						</div>
						<div class="header-actions" v-if="aiDialog.responseText && !aiDialog.isStreaming">
							<!-- 复制完整回答下拉框（采用与代码块复制按钮一致的样式风格） -->
							<el-dropdown trigger="click" @command="handleAiCopyCommand">
								<button class="ai-code-copy-btn" type="button" title="点击选择复制格式">
									<i class="el-icon-document-copy"></i> 复制回答 <i class="el-icon-arrow-down el-icon--right"></i>
								</button>
								<el-dropdown-menu slot="dropdown" :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
									<el-dropdown-item command="raw">
										<i class="el-icon-document-copy"></i> 复制 MD 格式
									</el-dropdown-item>
									<el-dropdown-item command="plain">
										<i class="el-icon-tickets"></i> 复制纯文本格式
									</el-dropdown-item>
								</el-dropdown-menu>
							</el-dropdown>
						</div>
					</div>

					<div class="response-card-body" ref="aiResponseScrollContainer">
						<div v-if="aiDialog.responseText" class="markdown-body ai-markdown-content" v-html="renderMarkdown(aiDialog.responseText)"></div>
						<span v-if="aiDialog.isStreaming" class="streaming-cursor">▌</span>

						<div v-if="!aiDialog.responseText && !aiDialog.isStreaming" class="ai-placeholder-text">
							<p v-if="!aiForm.apiKey" class="warning-text"><i class="el-icon-warning"></i> 请先在右上角配置 API Key 即可启动智能问答</p>
							<p v-else><i class="el-icon-chat-line-square"></i> 在下方输入追问内容或上传报错图片，点击发送即可与 AI 对话</p>
						</div>
					</div>
				</div>

				<!-- 底部交互式输入追问框 & 上传图片/工具单排栏 -->
				<div class="ai-input-composer">
					<!-- 图片预览缩略图 -->
					<transition name="el-zoom-in-top">
						<div v-if="aiSelectedImage" class="image-preview-badge">
							<img :src="aiSelectedImage.previewUrl" class="thumb-img" />
							<span class="thumb-name">{{ aiSelectedImage.name }}</span>
							<i class="el-icon-close remove-img-btn" @click="removeSelectedAiImage" title="移除图片"></i>
						</div>
					</transition>

					<div class="composer-toolbar">
						<el-input 
							type="textarea" 
							:rows="3" 
							v-model="aiInputQuery" 
							placeholder="输入追问、代码或报错 (Shift+Enter 换行，Enter 发送)..." 
							class="modern-el-input composer-textarea"
							@keyup.enter.native="handleComposerEnter"
						></el-input>
					</div>

					<!-- 底部一排单行工具栏（图标化与发送/停止按钮并排） -->
					<div class="composer-single-bar">
						<div class="bar-left-tools">
							<!-- 识图/上传图片按钮 (Icon 图标化) -->
							<el-tooltip :content="aiSelectedImage ? '更换分析图片' : '上传图片/截图分析'" placement="top">
								<el-button size="mini" class="icon-tool-btn" :class="{ 'has-file': !!aiSelectedImage }" icon="el-icon-picture-outline" @click="triggerAiImageUpload"></el-button>
							</el-tooltip>

							<div class="tool-divider"></div>

							<!-- 快捷场景预设 Icon 芯片 -->
							<div class="preset-icon-group">
								<el-tooltip content="🎯 详细排错" placement="top">
									<span class="preset-icon-chip" @click="applyPromptPreset('详细排错分析')">🎯</span>
								</el-tooltip>
								<el-tooltip content="💡 代码优化" placement="top">
									<span class="preset-icon-chip" @click="applyPromptPreset('代码优化与修复')">💡</span>
								</el-tooltip>
								<el-tooltip content="📝 简明总结" placement="top">
									<span class="preset-icon-chip" @click="applyPromptPreset('简明原因总结')">📝</span>
								</el-tooltip>
								<el-tooltip content="🌐 日志翻译" placement="top">
									<span class="preset-icon-chip" @click="applyPromptPreset('英文日志翻译')">🌐</span>
								</el-tooltip>
							</div>

							<div class="tool-divider" v-if="aiInputQuery"></div>

							<!-- 一键清空输入框文本Icon按钮 -->
							<el-tooltip v-if="aiInputQuery" content="清空输入内容" placement="top">
								<el-button size="mini" type="text" class="clear-input-btn" icon="el-icon-delete" @click="aiInputQuery = ''"></el-button>
							</el-tooltip>
						</div>

						<div class="bar-right-actions">
							<!-- 未流式生成时展示发送按钮，带禁用校验 -->
							<el-button 
								v-if="!aiDialog.isStreaming"
								size="small" 
								type="primary" 
								class="primary-gradient-btn send-btn" 
								icon="el-icon-s-promotion" 
								:disabled="!canSendAiQuery"
								@click="sendAiQueryStream(false)">
								发送
							</el-button>

							<!-- 流式生成中展示停止回复按钮 -->
							<el-button 
								v-else
								size="small" 
								type="danger" 
								class="stop-btn" 
								icon="el-icon-video-pause" 
								@click="abortAiStream">
								停止回复
							</el-button>
						</div>
					</div>
				</div>
			</div>

			<!-- 视图 2：AI 历史提问与回复列表 (最多保存 10 条 FIFO) -->
			<div v-show="aiActiveTab === 'history'" class="ai-history-view-container">
				<div class="history-list-header">
					<span class="history-count-title"><i class="el-icon-history"></i> 本地问答历史 ({{ aiHistory.length }}/10 条)</span>
					<el-button v-if="aiHistory.length > 0" size="mini" type="text" class="danger-text-btn" icon="el-icon-delete" @click="clearAllAiHistory">清空全部历史</el-button>
				</div>

				<div class="history-card-list">
					<div v-if="aiHistory.length === 0" class="history-empty-hint">
						<i class="el-icon-notebook-2"></i>
						<span>暂无保存的 AI 历史提问记录</span>
					</div>

					<div 
						v-for="(item, idx) in aiHistory" 
						:key="item.id || idx" 
						class="history-item-card"
						:class="{ 'is-active-history': currentActiveHistoryId === item.id }"
					>
						<div class="history-item-top">
							<div class="history-title-group">
								<span class="history-index-tag">#{{ idx + 1 }}</span>
								<span class="history-time">{{ item.timestamp }}</span>
							</div>
							<div class="history-actions-group">
								<el-button size="mini" type="text" icon="el-icon-right" @click="loadHistoryToChat(item)">查看/载入追问</el-button>
								<el-button size="mini" type="text" class="danger-text-btn" icon="el-icon-close" @click="deleteSingleHistory(item.id)"></el-button>
							</div>
						</div>

						<div class="history-query-snippet">
							<strong>问：</strong> {{ item.queryText }}
							<span v-if="item.image" class="history-image-tag"><i class="el-icon-picture-outline"></i> 含图片</span>
						</div>

						<div class="history-response-snippet">
							<strong>答：</strong> {{ getPlainSummary(item.responseText) }}
						</div>
					</div>
				</div>
			</div>

			<div slot="footer" class="ai-dialog-footer">
				<div class="footer-left">
					<span v-if="aiDialog.isStreaming" class="streaming-tip"><i class="el-icon-loading"></i> AI 数据流实时生成中...</span>
				</div>
			</div>
		</el-dialog>

		<!-- 全局附件右键快捷上下文菜单 Popup -->
		<div 
			v-show="contextMenuVisible" 
			class="custom-context-menu-popover" 
			:class="isDark ? 'custom-dark-popover' : 'custom-light-popover'"
			:style="contextMenuStyle" 
			@click.stop
		>
			<div class="action-menu-list">
				<div class="action-item" @click="handleContextMenuAction('preview')">
					<i class="el-icon-view"></i> <span>预览文件</span>
				</div>
				<div class="action-divider"></div>
				<div class="action-item" @click="handleContextMenuAction('download')">
					<i class="el-icon-download"></i> <span>直接下载</span>
				</div>
				<div class="action-divider"></div>
				<div class="action-item" @click="handleContextMenuAction('svn')">
					<i class="el-icon-upload2"></i> <span>提交到 SVN</span>
				</div>
			</div>
		</div>

		<!-- 导出文档类型选择弹窗 -->
		<el-dialog v-dialogDrag title="选择导出文件格式" :visible.sync="exportFormatDialogVisible" :width="smallDialogWidth" :close-on-click-modal="false" custom-class="modern-dialog">
			<el-form label-position="top" size="small">
				<el-form-item label="请选择您要导出的文件格式：">
					<el-radio-group v-model="selectedExportFormat" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
						<el-radio label="docx" border>Word 文档 (.docx) - 转换纯文本</el-radio>
						<el-radio label="doc" border>Word 97-2003 文档 (.doc) - 转换纯文本</el-radio>
						<el-radio label="md" border>Markdown 源文件 (.md) - 保留语法排版</el-radio>
					</el-radio-group>
				</el-form-item>
			</el-form>
			<div slot="footer">
				<el-button size="small" plain @click="exportFormatDialogVisible = false">取 消</el-button>
				<el-button size="small" type="primary" class="primary-gradient-btn" icon="el-icon-download" @click="confirmExport">确 认 导 出</el-button>
			</div>
		</el-dialog>

		<!-- SVN 提交/拉取 认证与配置弹窗 -->
		<el-dialog v-dialogDrag :title="(svnForm.action === 'commit_file' ? '提交附件文件到 SVN 仓库 - ' + (svnTargetFile ? svnTargetFile.name : '') : ((svnForm.action === 'commit' ? '提交排错文档到 SVN 仓库' : '从 SVN 仓库拉取') + (svnTargetProblem ? ' - ' + svnTargetProblem.title : '')))"
			:visible.sync="svnDialogVisible" :width="dialogWidth" :close-on-click-modal="false" custom-class="modern-dialog">
			<el-form :model="svnForm" ref="svnFormRef" :rules="svnRules" size="small" label-position="top">
				<el-form-item label="SVN 项目文件 HTTP/HTTPS 地址 (Repository URL)" prop="repoUrl">
					<el-input class="modern-el-input" v-model="svnForm.repoUrl" placeholder="例如: http://192.168.3.5/svn/ 或 https://..."></el-input>
				</el-form-item>
				
				<el-row :gutter="16">
					<el-col :span="12">
						<el-form-item label="SVN 用户名 (Username)" prop="username">
							<el-input class="modern-el-input" v-model="svnForm.username" placeholder="请输入 SVN 登录账号"></el-input>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="SVN 密码 (Password)" prop="password">
							<el-input class="modern-el-input" v-model="svnForm.password" type="password" show-password placeholder="请输入 SVN 登录密码"></el-input>
						</el-form-item>
					</el-col>
				</el-row>

				<el-form-item label="提交日志备注 (Commit Message)" prop="commitMsg" v-if="svnForm.action === 'commit' || svnForm.action === 'commit_file'">
					<el-input class="modern-el-input" type="textarea" :rows="3" v-model="svnForm.commitMsg" placeholder="例如: 更新了排错附件说明或单独提交附件文件..."></el-input>
				</el-form-item>

				<div class="share-summary-bar" style="margin-top: 10px;">
					<i class="el-icon-info"></i>
					<span>{{ svnForm.action === 'commit_file' ? '前端将使用 WebDAV 协议将当前附件直接写入远端 SVN 仓库。' : (svnForm.action === 'commit' ? '前端将生成 Word(.docx) 并通过 WebDAV PUT 请求直接写入远端 SVN 仓库。' : '前端将读取远端 SVN 文件文本并覆盖当前编辑区。') }}</span>
				</div>
			</el-form>
			<div slot="footer">
				<el-button @click="svnDialogVisible = false" size="small" plain :disabled="svnSubmitting">取 消</el-button>
				<el-button type="primary" size="small" class="primary-gradient-btn" :loading="svnSubmitting" @click="submitSvnAction">
					{{ svnForm.action === 'commit_file' ? '提 交 附 件 到 SVN' : (svnForm.action === 'commit' ? '提 交 文 档 到 SVN' : '拉 取 SVN 文 档') }}
				</el-button>
			</div>
		</el-dialog>

		<!-- 附件文件在线预览与可编辑保存弹窗 -->
		<el-dialog 
			v-dialogDrag 
			:title="(isEditMode ? '在线编辑模式 - ' : '文件原生预览 - ') + (previewFile ? previewFile.name : '')"
			:visible.sync="previewDialogVisible" 
			:width="isMobile ? '95%' : '880px'" 
			:close-on-click-modal="false" 
			custom-class="modern-dialog preview-modal"
			@closed="resetPreview"
		>
			<div class="dialog-top-toolbar" v-if="canManageShare(currentProblemOfPreview)">
				<span class="mode-tip">
					<i :class="isEditMode ? 'el-icon-edit' : 'el-icon-view'"></i>
					{{ isEditMode ? '当前正处于可编辑模式（注：保存后动态目录将转为静态排版文本）' : '当前为极速只读预览模式' }}
				</span>
				<el-switch
					v-if="['office_excel', 'office_word', 'text'].includes(previewFileType)"
					v-model="isEditMode"
					active-text="编辑模式"
					inactive-text="预览模式"
					active-color="#0ea5e9"
					@change="handleToggleEditMode">
				</el-switch>
			</div>

			<!-- Word 内嵌解压附件栏 -->
			<div v-if="wordEmbeddedFiles && wordEmbeddedFiles.length > 0" class="word-embeddings-bar" style="margin-bottom: 12px; padding: 10px 14px; background: rgba(14, 165, 233, 0.08); border: 1px dashed #0ea5e9; border-radius: 8px;">
				<div style="font-size: 13px; font-weight: 600; color: var(--primary-blue); display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
					<i class="el-icon-paperclip"></i>
					<span>检测到 Word 文档内置嵌入了 {{ wordEmbeddedFiles.length }} 个附件文件：</span>
				</div>
				<div style="display: flex; flex-wrap: wrap; gap: 8px;">
					<el-button 
						v-for="(emb, eIdx) in wordEmbeddedFiles" 
						:key="'emb-' + eIdx" 
						size="mini" 
						type="primary" 
						plain 
						icon="el-icon-download"
						@click="downloadBlob(emb.blob, emb.name)">
						{{ emb.name }} ({{ emb.size }})
					</el-button>
				</div>
			</div>

			<div class="file-preview-body" v-loading="previewLoading" element-loading-text="正在解析加载文件与扫描内嵌附件，请稍候...">
				
				<!-- 1. Excel 在线编辑/预览 -->
				<div v-if="previewFileType === 'office_excel'" class="preview-excel-container">
					<div v-if="isEditMode">
						<div class="excel-toolbar">
							<el-button size="mini" type="primary" icon="el-icon-plus" @click="addExcelRow">添加新表格行</el-button>
							<span class="toolbar-hint">双击或点击单元格直接修改值（保存后将平滑转存为标准 .xlsx 格式）</span>
						</div>
						<div class="excel-table-scroll">
							<table class="custom-editable-excel-table">
								<tbody>
									<tr v-for="(row, rIdx) in excelData" :key="'r-' + rIdx">
										<td class="row-num-col">{{ rIdx + 1 }}</td>
										<td v-for="(cell, cIdx) in row" :key="'c-' + rIdx + '-' + cIdx">
											<input v-model="excelData[rIdx][cIdx]" class="cell-inline-input" />
										</td>
										<td class="action-col">
											<i class="el-icon-delete delete-row-btn" title="删除整行" @click="deleteExcelRow(rIdx)"></i>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div v-else class="excel-preview-readonly">
						<div class="excel-table-scroll" v-if="excelData && excelData.length > 0">
							<table class="custom-editable-excel-table readonly-table">
								<tbody>
									<tr v-for="(row, rIdx) in excelData" :key="'pv-r-' + rIdx">
										<td class="row-num-col">{{ rIdx + 1 }}</td>
										<td v-for="(cell, cIdx) in row" :key="'pv-c-' + rIdx + '-' + cIdx">
											<span class="cell-readonly-text">{{ cell }}</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div v-else class="preview-fallback-container">
							<p>未提取到有效的表格数据，您可以点击“下载原文件”在本地打开。</p>
						</div>
					</div>
				</div>

				<!-- 2. Word 在线编辑/预览 -->
				<div v-else-if="previewFileType === 'office_word'" class="preview-word-container">
					<div v-if="isEditMode" class="word-editor-wrapper">
						<div class="word-toolbar">
							<el-button-group size="mini">
								<el-button size="mini" @click="execWordCmd('bold')" title="加粗"><b>B</b></el-button>
								<el-button size="mini" @click="execWordCmd('italic')" title="斜体"><i>I</i></el-button>
								<el-button size="mini" @click="execWordCmd('underline')" title="下划线"><u>U</u></el-button>
								<el-button size="mini" @click="execWordCmd('justifyLeft')" title="居左对齐"><i class="el-icon-s-unfold"></i></el-button>
								<el-button size="mini" @click="execWordCmd('justifyCenter')" title="居中对齐"><i class="el-icon-s-operation"></i></el-button>
								<el-button size="mini" @click="execWordCmd('justifyRight')" title="居右对齐"><i class="el-icon-s-fold"></i></el-button>
								<el-button size="mini" @click="execWordCmd('formatBlock', '<h1>')" title="一级标题 / 目录章">H1</el-button>
								<el-button size="mini" @click="execWordCmd('formatBlock', '<h2>')" title="二级标题 / 目录节">H2</el-button>
								<el-button size="mini" @click="execWordCmd('formatBlock', '<h3>')" title="三级标题">H3</el-button>
								<el-button size="mini" @click="execWordCmd('formatBlock', '<p>')" title="正文段落">正文</el-button>
								<el-button size="mini" @click="execWordCmd('insertUnorderedList')" title="无序列表"><i class="el-icon-tickets"></i> 列表</el-button>
							</el-button-group>
							<span class="toolbar-hint" style="margin-left: 12px; font-size: 12px; color: var(--primary-blue);">
								<i class="el-icon-info"></i> 已开启富文本模式，完美还原居中、缩进、目录及级联标题格式
							</span>
						</div>
						<div 
							ref="wordEditableBox"
							class="word-editable-box markdown-body" 
							contenteditable="true" 
							@input="onWordContentInput">
						</div>
					</div>
					<div v-else class="word-preview-readonly">
						<div v-if="wordContent" class="word-view-box markdown-body dialog-preview-body" v-html="wordContent"></div>
						<div ref="docxPreviewBox" class="docx-preview-box dialog-preview-body" v-show="!wordContent"></div>
					</div>
				</div>

				<!-- 3. 图片预览 -->
				<div v-else-if="previewFileType === 'image'" class="preview-img-container">
					<img :src="previewFile.url" :alt="previewFile.name" class="preview-img" />
				</div>

				<!-- 4. PDF 文件预览 -->
				<div v-else-if="previewFileType === 'pdf'" class="preview-iframe-container">
					<iframe :src="previewFile.url" width="100%" height="520px" frameborder="0"></iframe>
				</div>

				<!-- 5. 纯文本 / 代码预览 -->
				<div v-else-if="previewFileType === 'text'" class="preview-text-container">
					<div v-if="isEditMode">
						<el-input type="textarea" :rows="16" v-model="previewContent" class="preview-text-input modern-el-input"></el-input>
					</div>
					<div v-else>
						<div v-if="isMarkdown(previewContent)" class="markdown-body dialog-preview-body" v-html="renderMarkdown(previewContent)"></div>
						<pre v-else class="preview-plain-code">{{ previewContent }}</pre>
					</div>
				</div>

				<!-- 6. 兜底未支持类型 -->
				<div v-else class="preview-fallback-container">
					<div class="fallback-icon"><i class="el-icon-folder-opened"></i></div>
					<h3>该文件类型 (.{{ getFileExt(previewFile ? previewFile.name : '') }}) 暂不支持在线渲染与编辑</h3>
					<p>您可以点击下方按钮直接下载到本地。</p>
				</div>
			</div>

			<div slot="footer" class="preview-dialog-footer">
				<div class="footer-left">
					<el-button v-if="isEditMode" size="small" type="success" class="primary-gradient-btn" icon="el-icon-check" :loading="previewLoading" @click="saveOfficeFile">
						保 存 并 覆 盖 答 案 附 件
					</el-button>
				</div>
				<div class="footer-right">
					<el-button size="small" type="primary" plain icon="el-icon-download" @click="downloadFile(previewFile)">
						下 载 原 文 件
					</el-button>
					<el-button size="small" plain @click="previewDialogVisible = false">关 闭</el-button>
				</div>
			</div>
		</el-dialog>

		<!-- 指定用户共享设置弹窗 -->
		<el-dialog v-dialogDrag :title="'指定共享用户 - ' + (shareTargetType === 'category' ? '分类目录【' + (shareTargetItem ? shareTargetItem.name : '') + '】' : '文档【' + (shareTargetItem ? shareTargetItem.title : '') + '】')"
			:visible.sync="shareDialogVisible" :width="dialogWidth" :close-on-click-modal="false" custom-class="modern-dialog">
			
			<div class="share-dialog-content" v-loading="userListLoading">
				<div class="share-filter-header">
					<el-input size="small" v-model="searchUserQuery" placeholder="搜索用户名..." prefix-icon="el-icon-search" clearable class="modern-el-input"></el-input>
					<div class="quick-select-btns">
						<el-button size="mini" type="text" @click="handleSelectAllUsers(true)">全 选</el-button>
						<el-button size="mini" type="text" @click="handleSelectAllUsers(false)">清 空</el-button>
					</div>
				</div>

				<div class="user-select-list-wrapper">
					<div v-if="filteredUserList.length === 0" class="empty-user-hint">
						<i class="el-icon-user"></i>
						<span>暂无匹配的用户</span>
					</div>

					<el-checkbox-group v-model="selectedShareUserIds" class="user-checkbox-grid">
						<div class="user-checkbox-item" v-for="user in filteredUserList" :key="user.id">
							<el-checkbox :label="user.id" border size="small">
								<i class="el-icon-user"></i> {{ user.username }}
							</el-checkbox>
						</div>
					</el-checkbox-group>
				</div>

				<div class="share-summary-bar">
					<i class="el-icon-info"></i>
					<span>已选择 <strong>{{ selectedShareUserIds.length }}</strong> 位共享用户。未勾选用户将无法查看该{{ shareTargetType === 'category' ? '分类目录' : '文档' }}。</span>
				</div>
			</div>

			<div slot="footer">
				<el-button @click="shareDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="confirmSaveShareSettings" size="small" :loading="apiLoading" class="primary-gradient-btn">
					保 存 设 置
				</el-button>
			</div>
		</el-dialog>

		<!-- 移动目录弹窗 -->
		<el-dialog v-dialogDrag title="移动文档到指定目录" :visible.sync="moveDialogVisible" :width="smallDialogWidth" :close-on-click-modal="false"
			custom-class="modern-dialog">
			<el-form size="small" label-position="top">
				<el-form-item label="选择目标分类目录">
					<el-select class="modern-el-input" v-model="moveToCategoryId" placeholder="请选择你要转移到的目标目录" style="width: 100%;"
						:popper-class="isDark ? 'custom-dark-select' : 'custom-light-select'">
						<el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id"
							:disabled="cat.id === (moveTargetProblem && moveTargetProblem.categoryId)">
							<span style="float: left">{{ cat.name }}</span>
							<span v-if="cat.id === (moveTargetProblem && moveTargetProblem.categoryId)"
								style="float: right; color: #8492a6; font-size: 13px">当前所在</span>
						</el-option>
					</el-select>
				</el-form-item>
			</el-form>
			<div slot="footer">
				<el-button @click="moveDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="confirmMoveProblem" size="small" :loading="apiLoading"
					class="primary-gradient-btn">确 认 移 动</el-button>
			</div>
		</el-dialog>

		<!-- 删除确认窗 -->
		<el-dialog v-dialogDrag title="操作确认" :visible.sync="deleteDialogVisible" :width="smallDialogWidth" :close-on-click-modal="false"
			custom-class="modern-dialog">
			<div class="dialog-danger-content">
				<i class="el-icon-warning"></i>
				<span>{{ deleteMessage }}</span>
			</div>
			<div slot="footer">
				<el-button @click="deleteDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="danger" @click="confirmDelete" size="small" :loading="apiLoading">确 认 删 除</el-button>
			</div>
		</el-dialog>

		<!-- 撤回提示 Toast -->
		<transition name="toast-slide-down">
			<div class="undo-toast" v-if="undoData" :class="{ 'is-dark-toast': isDark }">
				<div class="undo-toast-content">
					<i class="el-icon-circle-check"></i>
					<span>已先移出视图，<strong class="countdown-text">{{ undoCountdown }}</strong> 秒内可撤销恢复。</span>
				</div>
				<el-button class="undo-btn" size="mini" @click="executeUndo">撤回恢复</el-button>
			</div>
		</transition>
		<transition name="toast-slide-up">
			<div class="custom-success-toast" v-if="toastVisible" :class="{ 'is-dark-toast': isDark }">
				<i class="el-icon-success"></i>
				<span>{{ toastMsg }}</span>
			</div>
		</transition>

		<!-- 新建分类窗 -->
		<el-dialog v-dialogDrag title="新建分类" :visible.sync="categoryVisible" :width="smallDialogWidth" :close-on-click-modal="false"
			custom-class="modern-dialog">
			<el-form :model="categoryForm" ref="categoryForm" :rules="categoryRules" size="small" label-position="top" @submit.native.prevent="submitCategory">
				<el-form-item label="分类名称" prop="name">
					<el-input class="modern-el-input" v-model="categoryForm.name" placeholder="例如: 前端工程化、数据库排错..." @keyup.enter.native="submitCategory"></el-input>
				</el-form-item>
			</el-form>
			<div slot="footer">
				<el-button @click="categoryVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="submitCategory" size="small" :loading="apiLoading"
					class="primary-gradient-btn">确 认</el-button>
			</div>
		</el-dialog>

		<!-- 录入故障弹窗 -->
		<el-dialog v-dialogDrag :title="'在【' + currentCategoryName + '】中录入'" :visible.sync="problemVisible" :width="dialogWidth"
			:close-on-click-modal="false" custom-class="modern-dialog">
			<el-form :model="problemForm" ref="problemForm" :rules="problemRules" size="small" label-position="top">
				<el-form-item label="文档标题" prop="title">
					<el-input class="modern-el-input" v-model="problemForm.title"
						placeholder="请描述报错信息或现象 (例如: Nginx 502 Bad Gateway)"></el-input>
				</el-form-item>
				<el-form-item label="文档内容 (支持粘贴代码/图片/Markdown文本)" prop="solution">
					<el-input class="modern-el-input" type="textarea" :autosize="{ minRows: 6, maxRows: 12 }" v-model="problemForm.solution"
						placeholder="可以粘贴 Bash 命令、日志、代码块、图片URL或 Markdown 文本..."></el-input>
				</el-form-item>

				<transition name="el-fade-in-linear">
					<div v-if="isMarkdown(problemForm.solution)" class="dialog-md-preview-wrapper">
						<div class="preview-title">
							<i class="el-icon-view"></i> 实时 Markdown 渲染预览
							<span class="md-tag"><i class="el-icon-document-checked"></i> 已识别 MD 格式</span>
						</div>
						<div class="markdown-body dialog-preview-body" v-html="renderMarkdown(problemForm.solution)"></div>
					</div>
				</transition>
			</el-form>
			<div slot="footer">
				<el-button @click="problemVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="submitProblem" size="small" :loading="apiLoading"
					class="primary-gradient-btn">保 存 发 布</el-button>
			</div>
		</el-dialog>

		<!-- 导入文档核对与确认录入弹窗 -->
		<el-dialog v-dialogDrag :title="'核对并导入文档到【' + currentCategoryName + '】'" :visible.sync="importDialogVisible" :width="dialogWidth"
			:close-on-click-modal="false" custom-class="modern-dialog">
			<el-form :model="importForm" ref="importForm" :rules="problemRules" size="small" label-position="top">
				<el-form-item label="文档标题" prop="title">
					<el-input class="modern-el-input" v-model="importForm.title" placeholder="请核对或修改导入文档标题"></el-input>
				</el-form-item>
				<el-form-item label="文档内容 (已自动提取文档内容，可直接编辑修改)" prop="solution">
					<el-input class="modern-el-input" type="textarea" :autosize="{ minRows: 8, maxRows: 16 }" v-model="importForm.solution"
						placeholder="文档排查思路与代码..."></el-input>
				</el-form-item>

				<transition name="el-fade-in-linear">
					<div v-if="isMarkdown(importForm.solution)" class="dialog-md-preview-wrapper">
						<div class="preview-title">
							<i class="el-icon-view"></i> 实时 Markdown 渲染预览
							<span class="md-tag"><i class="el-icon-document-checked"></i> 已识别 MD 格式</span>
						</div>
						<div class="markdown-body dialog-preview-body" v-html="renderMarkdown(importForm.solution)"></div>
					</div>
				</transition>
			</el-form>
			<div slot="footer">
				<el-button @click="importDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="confirmImportProblem" size="small" :loading="apiLoading"
					class="primary-gradient-btn">确 认 录 入</el-button>
			</div>
		</el-dialog>

	</div>
</template>

<script>
import { marked } from 'marked';
import {
    create_categories, 
    create_problems, 
    get_problems, 
    get_categories, 
	update_problems_categories,
	upload_doc,
	del_doc,
	del_categories,
	del_problems,
	get_users,
	update_category_share,
	update_problem_share,
	download_file,
} from '../../api';

import axios from 'axios'
import baseUrl from '../../utils/baseUrl'

import {
	Message,
	MessageBox
} from 'element-ui';

// 配置 marked 的自定义渲染器
const renderer = new marked.Renderer();
const escapeHtml = (str) => {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

renderer.code = function(code, infostring) {
	let codeText = '';
	let lang = '';
	if (typeof code === 'object' && code !== null) {
		codeText = code.text || '';
		lang = code.lang || '';
	} else {
		codeText = code || '';
		lang = infostring || '';
	}

	const cleanLang = (lang || '').trim().split(/\s+/)[0];
	const escapedCode = escapeHtml(codeText);

	return `<div class="code-block-wrapper">
		<div class="code-block-header">
			<span class="code-lang-label">${cleanLang ? cleanLang.toUpperCase() : 'CODE'}</span>
			<button class="code-copy-btn" type="button" title="点击复制代码块内容">
				<i class="el-icon-document-copy"></i> 复制
			</button>
		</div>
		<pre><code class="${cleanLang ? 'language-' + cleanLang : ''}">${escapedCode}</code></pre>
	</div>`;
};

marked.use({
	renderer,
	gfm: true,
	breaks: true,
});

const getNowDate = () => new Date().toISOString().split('T')[0];

const getFormattedDateTime = () => {
	const now = new Date();
	const date = now.toISOString().split('T')[0];
	const time = now.toTimeString().split(' ')[0].substring(0, 5);
	return `${date} ${time}`;
};

export default {
	name: 'TroubleRecord',
	directives: {
        dialogDrag: {
            bind(el) {
                const dialogHeaderEl = el.querySelector('.el-dialog__header');
                const dragDom = el.querySelector('.el-dialog');
                if (!dialogHeaderEl || !dragDom) return;
                
                dialogHeaderEl.style.cursor = 'move';
                const sty = dragDom.currentStyle || window.getComputedStyle(dragDom, null);

                dialogHeaderEl.onmousedown = (e) => {
                    e.preventDefault(); 
                    const disX = e.clientX - dialogHeaderEl.offsetLeft;
                    const disY = e.clientY - dialogHeaderEl.offsetTop;

                    let styL = sty.left;
                    let styT = sty.top;

                    if (styL === 'auto') {
                        styL = '0px';
                    } else if (styL.includes('%')) {
                        styL = +document.body.clientWidth * (+styL.replace(/\%/g, '') / 100) + 'px';
                    }

                    if (styT === 'auto') {
                        styT = '0px';
                    } else if (styT.includes('%')) {
                        styT = +document.body.clientHeight * (+styT.replace(/\%/g, '') / 100) + 'px';
                    }

                    const initLeft = parseFloat(styL) || 0;
                    const initTop = parseFloat(styT) || 0;

                    document.onmousemove = function (e) {
                        const l = e.clientX - disX;
                        const t = e.clientY - disY;
                        dragDom.style.left = `${l + initLeft}px`;
                        dragDom.style.top = `${t + initTop}px`;
                    };

                    document.onmouseup = function () {
                        document.onmousemove = null;
                        document.onmouseup = null;
                    };
                };
            }
        }
    },
	data() {
		const savedActiveCatId = localStorage.getItem('trouble_docs_active_cat_id');
		const savedCurrentPage = localStorage.getItem('trouble_docs_current_page');

		let initialAiHistory = [];
		try {
			const historyStr = localStorage.getItem('trouble_docs_ai_history');
			if (historyStr) {
				initialAiHistory = JSON.parse(historyStr);
			}
		} catch (e) {
			console.error('parse ai history error:', e);
		}

		return {
			isDark: true,
			sidebarCollapsed: false,
			isMobile: false,
			pageLoading: true,
			apiLoading: false,

			activeCategoryId: savedActiveCatId ? Number(savedActiveCatId) : null,
			onlyMyCategories: localStorage.getItem('trouble_docs_only_my_cat') === 'true',

			showScrollButtons: false,
			isContentVisible: true,

			cardDealKey: Date.now(),
			showCardOverview: true,
			highlightedProblemId: null,
			highlightTimer: null,

			currentPage: savedCurrentPage ? Number(savedCurrentPage) : 1,
			pageSize: 5,
			totalProblems: 0,
			totalCategories: 0,

			uploadTargetProbId: null,

			isBatchMode: false,
			selectedProblemIds: [],

			moveDialogVisible: false,
			moveTargetProblem: null,
			moveToCategoryId: null,

			categoryVisible: false,
			problemVisible: false,

			importDialogVisible: false,
			importForm: { title: '', solution: '' },

			searchCategoryQuery: '',
			
			searchProblemInput: '',
			searchProblemQuery: '',
			lastSearchedQuery: '', 

			scrollMarkers: [],
			activeMarkerId: null,

			deleteDialogVisible: false,
			deleteMessage: '',
			deleteTarget: null,

			undoData: null,
			undoTimer: null,
			undoCountdown: 20,
			toastVisible: false,
			toastMsg: '',
			toastTimer: null,

			editCategoryId: null,
			editCategoryName: '',
			editTitleId: null,
			editSolutionId: null,

			categories: [],
			problems: [],

			// ======== 划选文字 AI 提问、追问与历史记录数据 ========
			aiTooltip: {
				visible: false,
				top: 0,
				left: 0,
				selectedText: ''
			},
			aiActiveTab: 'chat', // 'chat' | 'history'
			aiForm: {
				apiKey: localStorage.getItem('ai_api_key') || '',
				model: localStorage.getItem('ai_model') || 'gemini-1.5-flash',
				customPrompt: localStorage.getItem('ai_custom_prompt') || '请帮我分析以下报错/文档，并给出具体的排查定位思路与解决方案：'
			},
			aiDialog: {
				visible: false,
				isStreaming: false,
				showSettings: false,
				queryText: '',
				responseText: ''
			},
			aiInputQuery: '', // 手动追问输入框文本
			aiSelectedImage: null, // { name: '', mimeType: '', base64: '', previewUrl: '' }
			aiHistory: Array.isArray(initialAiHistory) ? initialAiHistory : [],
			currentActiveHistoryId: null,
			aiAbortController: null,

			// ======== 附件右键快捷菜单状态 ========
			contextMenuVisible: false,
			contextMenuFile: null,
			contextMenuProb: null,
			contextMenuStyle: {
				top: '0px',
				left: '0px'
			},

			// ======== 导出文件格式弹窗数据 ========
			exportFormatDialogVisible: false,
			exportMode: 'all',
			exportTargetProb: null,
			selectedExportFormat: 'docx',

			// ======== SVN 直连同步弹窗数据 ========
			svnDialogVisible: false,
			svnSubmitting: false,
			svnTargetProblem: null,
			svnTargetFile: null, 
			svnForm: {
				action: 'commit', // commit | pull | commit_file
				repoUrl: localStorage.getItem('svn_last_repo_url') || '',
				username: localStorage.getItem('svn_last_username') || '',
				password: '',
				commitMsg: ''
			},
			svnRules: {
				repoUrl: [{ required: true, message: '请输入 SVN 文件 HTTP/HTTPS 地址', trigger: 'blur' }],
				username: [{ required: true, message: '请输入 SVN 用户名', trigger: 'blur' }],
				password: [{ required: true, message: '请输入 SVN 密码', trigger: 'blur' }],
				commitMsg: [{ required: true, message: '请输入提交说明', trigger: 'blur' }]
			},

			// ======== 共享设置数据 ========
			shareDialogVisible: false,
			shareTargetType: 'category',
			shareTargetItem: null,
			userList: [],
			userListLoading: false,
			selectedShareUserIds: [],
			searchUserQuery: '',

			// ======== 附件文件在线预览与编辑数据 ========
			previewDialogVisible: false,
			previewFile: null,
			currentProblemOfPreview: null,
			previewFileType: '', 
			previewContent: '',
			previewLoading: false,
			isEditMode: false,
			excelData: [],
			wordContent: '',
			wordEmbeddedFiles: [],

			categoryForm: { name: '' },
			categoryRules: { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] },
			problemForm: { title: '', solution: '' },
			problemRules: {
				title: [{ required: true, message: '描述不能为空', trigger: 'blur' }],
				solution: [{ required: true, message: '请提供排查思路', trigger: 'blur' }]
			}
		}
	},
	computed: {
		// 计算 AI 提问是否具备发送条件（有文字输入或已选择图片）
		canSendAiQuery() {
			const hasText = !!(this.aiInputQuery && this.aiInputQuery.trim().length > 0);
			const hasImg = !!this.aiSelectedImage;
			return hasText || hasImg;
		},

		dialogWidth() {
			return this.isMobile ? '94%' : '750px';
		},
		smallDialogWidth() {
			return this.isMobile ? '90%' : '440px';
		},

		canAddProblemInCurrentCategory() {
			if (!this.currentCategory) return false;
			return this.canManageShare(this.currentCategory);
		},

		currentUser() {
			try {
				const userStr = localStorage.getItem('userInfo') || localStorage.getItem('user');
				if (userStr) {
					return JSON.parse(userStr);
				}
			} catch (e) {
				console.error('parse currentUser error:', e);
			}
			return {
				id: Number(localStorage.getItem('userId') || localStorage.getItem('uid') || 0),
				username: localStorage.getItem('username') || localStorage.getItem('sign') || ''
			};
		},

		filteredUserList() {
			const curUser = this.currentUser || {};
			const curId = curUser.id;
			const curUsername = (curUser.username || '').trim().toLowerCase();

			let list = (this.userList || []).filter(u => {
				if (curId && u.id && Number(u.id) === Number(curId)) {
					return false;
				}
				if (curUsername && u.username && u.username.trim().toLowerCase() === curUsername) {
					return false;
				}
				return true;
			});

			if (!this.searchUserQuery) {
				return list;
			}

			const query = this.searchUserQuery.toLowerCase().trim();
			return list.filter(u => u.username && u.username.toLowerCase().includes(query));
		},

		filteredCategories() {
			let result = this.categories;

			if (this.onlyMyCategories) {
				result = result.filter(c => this.canManageShare(c));
			}

			if (this.searchCategoryQuery) {
				const query = this.searchCategoryQuery.toLowerCase();
				result = result.filter(c => c.name.toLowerCase().includes(query));
			}

			return result.map(cat => {
				const count = (cat.problems && Array.isArray(cat.problems))
					? cat.problems.length
					: this.problems.filter(p => Number(p.categoryId) === Number(cat.id)).length;
				return {
					...cat,
					docCount: count
				};
			});
		},
		currentCategory() {
			if (!this.activeCategoryId) return null;
			return this.filteredCategories.find(c => Number(c.id) === Number(this.activeCategoryId)) || null;
		},
		currentCategoryName() {
			return this.currentCategory ? this.currentCategory.name : '全部记录';
		},
		currentProblems() {
			let probs = this.problems;

			if (this.activeCategoryId !== null && this.activeCategoryId !== undefined) {
				const targetId = Number(this.activeCategoryId);
				probs = probs.filter(p => Number(p.categoryId) === targetId);
			}

			if (this.searchProblemQuery) {
				const query = this.searchProblemQuery.toLowerCase();
				probs = probs.filter(
					p => p.title.toLowerCase().includes(query) || p.solution.toLowerCase().includes(query)
				);
			}
			return probs;
		},
		paginatedProblems() {
			return this.currentProblems;
		},
		computedTotalProblems() {
			if (this.searchProblemQuery) {
				return this.currentProblems.length;
			}
			if (this.currentCategory && typeof this.currentCategory.docCount === 'number') {
				return this.currentCategory.docCount;
			}
			if (typeof this.totalProblems === 'number' && this.totalProblems > 0) {
				return this.totalProblems;
			}
			return this.currentProblems.length;
		},
		isIndeterminate() {
			const selectedInCurrentPage = this.paginatedProblems.filter(p => this.selectedProblemIds.includes(p.id)).length;
			return selectedInCurrentPage > 0 && selectedInCurrentPage < this.paginatedProblems.length;
		},
		checkAll: {
			get() {
				return this.paginatedProblems.length > 0 && this.paginatedProblems.every(p => this.selectedProblemIds.includes(p.id));
			},
			set(val) {
				const currentPageIds = this.paginatedProblems.map(p => p.id);
				if (val) {
					const toAdd = currentPageIds.filter(id => !this.selectedProblemIds.includes(id));
					this.selectedProblemIds.push(...toAdd);
				} else {
					this.selectedProblemIds = this.selectedProblemIds.filter(id => !currentPageIds.includes(id));
				}
			}
		}
	},
	watch: {
		paginatedProblems: {
			handler() {
				this.updateScrollMarkers();
			},
			immediate: true
		}
	},
	mounted() {
		this.checkMobile();
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('click', this.closeContextMenu);
		window.addEventListener('click', this.handleCodeBlockCopy, true);
		window.addEventListener('scroll', this.closeContextMenu, true);

		// 全局监听划选文本事件
		document.addEventListener('mouseup', this.handleTextSelection);
		document.addEventListener('mousedown', this.handleDocumentMouseDown);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('click', this.closeContextMenu);
		window.removeEventListener('click', this.handleCodeBlockCopy, true);
		window.removeEventListener('scroll', this.closeContextMenu, true);

		document.removeEventListener('mouseup', this.handleTextSelection);
		document.removeEventListener('mousedown', this.handleDocumentMouseDown);

		if (this.undoTimer) clearInterval(this.undoTimer);
		if (this.toastTimer) clearTimeout(this.toastTimer);
		if (this.highlightTimer) clearTimeout(this.highlightTimer);
		if (this.undoData) {
			this.commitPendingDelete();
		}
		this.abortAiStream();
		this.resetPreview();
	},
	async created() {
		await this.fetchData();
	},
	methods: {
		// ======== 复制 AI 完整回答（支持 MD / 纯文本 两种选择） ========
		handleAiCopyCommand(command) {
			if (!this.aiDialog.responseText) {
				this.showToast('暂无 AI 解答内容');
				return;
			}
			if (command === 'raw') {
				this.copySolution(this.aiDialog.responseText, '已复制 AI 回答 (Markdown 格式)');
			} else if (command === 'plain') {
				const plainText = this.convertMarkdownToPlainText(this.aiDialog.responseText);
				this.copySolution(plainText, '已复制 AI 回答 (纯文本格式)');
			}
		},

		// ======== 浮动 AI 悬浮球 & 划选提问核心逻辑 ========
		openAiDialogFromFab() {
			this.aiActiveTab = this.aiHistory.length > 0 ? 'history' : 'chat';
			this.aiDialog.visible = true;
		},

		handleDocumentMouseDown(e) {
			if (e.target && e.target.closest && (e.target.closest('.ai-selection-tooltip') || e.target.closest('.el-dialog') || e.target.closest('.ai-floating-fab'))) {
				return;
			}
			this.aiTooltip.visible = false;
		},

		handleTextSelection(e) {
			if (e.target && e.target.closest && (e.target.closest('.ai-selection-tooltip') || e.target.closest('.el-dialog') || e.target.closest('.ai-floating-fab'))) {
				return;
			}

			setTimeout(() => {
				const selection = window.getSelection();
				if (!selection) return;

				const selectedText = selection.toString().trim();
				if (!selectedText || selectedText.length < 2) {
					this.aiTooltip.visible = false;
					return;
				}

				if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					const rect = range.getBoundingClientRect();

					if (rect.width === 0 && rect.height === 0) {
						this.aiTooltip.visible = false;
						return;
					}

					this.aiTooltip.selectedText = selectedText;
					this.aiTooltip.top = Math.max(10, rect.top + window.scrollY - 38);
					this.aiTooltip.left = rect.left + window.scrollX + (rect.width / 2) - 40;
					this.aiTooltip.visible = true;
				}
			}, 20);
		},

		handleAskAiClick() {
			const query = this.aiTooltip.selectedText;
			this.aiTooltip.visible = false;
			if (!query) return;

			this.aiDialog.queryText = query;
			this.aiDialog.responseText = '';
			this.aiActiveTab = 'chat';
			this.currentActiveHistoryId = Date.now();
			this.aiDialog.visible = true;

			if (!this.aiForm.apiKey) {
				this.aiDialog.showSettings = true;
				this.showToast('请配置 Gemini API Key 以开启流式智能排错');
			} else {
				this.sendAiQueryStream(true);
			}
		},

		// ======== AI 图片上传多模态（Multimodal Vision）========
		triggerAiImageUpload() {
			this.$refs.aiImageFileInput.click();
		},

		handleAiImageSelect(e) {
			const file = e.target.files[0];
			if (!file) return;

			if (!file.type.startsWith('image/')) {
				this.showToast('请选择有效的图片文件');
				e.target.value = '';
				return;
			}

			if (file.size > 10 * 1024 * 1024) {
				this.showToast('图片大小限制在 10MB 以内');
				e.target.value = '';
				return;
			}

			const reader = new FileReader();
			reader.onload = (event) => {
				const dataUrl = event.target.result || '';
				const mimeType = file.type || 'image/png';
				const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

				this.aiSelectedImage = {
					name: file.name,
					mimeType: mimeType,
					base64: rawBase64,
					previewUrl: dataUrl
				};
				this.showToast(`图片【${file.name}】已导入，将用于图文联合分析`);
				e.target.value = '';
			};
			reader.readAsDataURL(file);
		},

		removeSelectedAiImage() {
			this.aiSelectedImage = null;
			if (this.$refs.aiImageFileInput) {
				this.$refs.aiImageFileInput.value = '';
			}
		},

		handleComposerEnter(e) {
			if (!e.shiftKey) {
				e.preventDefault();
				if (!this.canSendAiQuery) {
					this.showToast('请输入追问内容或选择分析图片');
					return;
				}
				this.sendAiQueryStream(false);
			}
		},

		applyPromptPreset(type) {
			if (type === '详细排错分析') {
				this.aiForm.customPrompt = '请详细分析以下报错信息/排错日志，给出底层根本原因与逐步解决步骤：';
			} else if (type === '代码优化与修复') {
				this.aiForm.customPrompt = '请检查并优化以下代码，列出潜藏风险并提供修复后的完整代码块：';
			} else if (type === '简明原因总结') {
				this.aiForm.customPrompt = '请用最简明扼要的 3 句话总结以下文档的核心结论与解决要点：';
			} else if (type === '英文日志翻译') {
				this.aiForm.customPrompt = '请将以下英文排错日志/文档翻译为中文，并对专业技术词汇进行简要释义：';
			}
			this.showToast(`已应用预设：${type}`);
		},

		saveAiSettings() {
			if (!this.aiForm.apiKey.trim()) {
				this.showToast('请输入有效的 API Key');
				return;
			}

			localStorage.setItem('ai_api_key', this.aiForm.apiKey.trim());
			localStorage.setItem('ai_model', this.aiForm.model.trim() || 'gemini-1.5-flash');
			localStorage.setItem('ai_custom_prompt', this.aiForm.customPrompt.trim());

			this.aiDialog.showSettings = false;
			this.showToast('AI 配置已成功持久化保存！');

			if ((this.aiDialog.queryText || this.aiInputQuery) && !this.aiDialog.responseText) {
				this.sendAiQueryStream(false);
			}
		},

		// ======== AI 历史记录持久化保存（最多 10 条 FIFO）========
		saveAiHistoryRecord(record) {
			if (!record || !record.queryText || !record.responseText) return;

			let historyList = [...this.aiHistory];
			const existingIndex = historyList.findIndex(item => item.id === record.id);

			if (existingIndex !== -1) {
				historyList.splice(existingIndex, 1, record);
			} else {
				historyList.unshift(record);
			}

			// FIFO 淘汰原则：最多保留 10 条最新问答
			if (historyList.length > 10) {
				historyList = historyList.slice(0, 10);
			}

			this.aiHistory = historyList;
			localStorage.setItem('trouble_docs_ai_history', JSON.stringify(historyList));
		},

		loadHistoryToChat(item) {
			if (!item) return;
			this.aiDialog.queryText = item.queryText;
			this.aiDialog.responseText = item.responseText;
			this.aiSelectedImage = item.image || null;
			this.currentActiveHistoryId = item.id;
			this.aiActiveTab = 'chat';
			this.scrollAiContentToBottom();
		},

		deleteSingleHistory(id) {
			this.aiHistory = this.aiHistory.filter(item => item.id !== id);
			localStorage.setItem('trouble_docs_ai_history', JSON.stringify(this.aiHistory));
			this.showToast('该条历史问答已删除');
		},

		clearAllAiHistory() {
			MessageBox.confirm('确定要清空全部 10 条 AI 问答历史吗?', '清空提示', {
				confirmButtonText: '确定清空',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				this.aiHistory = [];
				localStorage.removeItem('trouble_docs_ai_history');
				this.showToast('已清空全部历史记录');
			}).catch(() => {});
		},

		abortAiStream() {
			if (this.aiAbortController) {
				this.aiAbortController.abort();
				this.aiAbortController = null;
			}
			this.aiDialog.isStreaming = false;
			this.showToast('已终止 AI 生成');
		},

		handleAiDialogClose() {
			this.abortAiStream();
		},

		scrollAiContentToBottom() {
			this.$nextTick(() => {
				const container = this.$refs.aiResponseScrollContainer;
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			});
		},

		/**
		 * 核心：Gemini API SSE 流式输出推流与多模态识图发送
		 */
		async sendAiQueryStream(isNewSelection = false) {
			if (!this.aiForm.apiKey.trim()) {
				this.aiDialog.showSettings = true;
				this.showToast('请先填写 API Key');
				return;
			}

			let activeQuery = '';
			if (isNewSelection) {
				activeQuery = this.aiDialog.queryText;
			} else if (this.aiInputQuery.trim()) {
				activeQuery = this.aiInputQuery.trim();
				this.aiDialog.queryText = activeQuery;
			} else {
				activeQuery = this.aiDialog.queryText;
			}

			if (!activeQuery && !this.aiSelectedImage) {
				this.showToast('请输入追问内容或选择分析图片');
				return;
			}

			this.abortAiStream();
			this.aiAbortController = new AbortController();

			this.aiDialog.isStreaming = true;
			this.aiDialog.responseText = '';
			this.aiActiveTab = 'chat';

			const recordId = this.currentActiveHistoryId || Date.now();
			this.currentActiveHistoryId = recordId;

			const modelName = this.aiForm.model.trim() || 'gemini-1.5-flash';
			const apiKey = this.aiForm.apiKey.trim();
			const promptPrefix = this.aiForm.customPrompt || '请帮我分析以下报错/文档，并给出定位思路与解决方案：';

			const fullPromptText = `${promptPrefix}\n\n${activeQuery}`;

			// 构建 Gemini 请求的 parts (支持文本 + 图片 multimodal)
			const partsPayload = [
				{ text: fullPromptText }
			];

			if (this.aiSelectedImage && this.aiSelectedImage.base64) {
				partsPayload.push({
					inlineData: {
						mimeType: this.aiSelectedImage.mimeType || 'image/png',
						data: this.aiSelectedImage.base64
					}
				});
			}

			const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

			const payload = {
				contents: [{
					parts: partsPayload
				}]
			};

			try {
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(payload),
					signal: this.aiAbortController.signal
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
				}

				if (!response.body) {
					throw new Error('浏览器未返回可读数据流');
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder('utf-8');
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed.startsWith('data: ')) {
							const jsonStr = trimmed.replace(/^data:\s*/, '');
							if (jsonStr === '[DONE]') continue;

							try {
								const parsed = JSON.parse(jsonStr);
								const chunkText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
								if (chunkText) {
									this.aiDialog.responseText += chunkText;
									this.scrollAiContentToBottom();
								}
							} catch (e) {
								// 解析部分 JSON 片段异常容错
							}
						}
					}
				}

				if (!this.aiDialog.responseText) {
					this.aiDialog.responseText = 'AI 未能生成有效的解答内容，请尝试重新提问。';
				}

				// 保存到 10 条 FIFO 历史记录中
				this.saveAiHistoryRecord({
					id: recordId,
					queryText: activeQuery,
					responseText: this.aiDialog.responseText,
					image: this.aiSelectedImage ? { ...this.aiSelectedImage } : null,
					timestamp: getFormattedDateTime()
				});

				this.aiInputQuery = '';
			} catch (err) {
				if (err.name === 'AbortError') return;
				console.error('sendAiQueryStream error:', err);
				this.aiDialog.responseText = `**请求发生异常：** ${err.message || '网络连接超时，请检查 Key 或网络代理'}`;
			} finally {
				this.aiDialog.isStreaming = false;
				this.aiAbortController = null;
			}
		},

		handleCodeBlockCopy(e) {
			// 增加范围限定，仅拦截代码块容器内部的复制按钮
			const copyBtn = e.target ? e.target.closest('.code-block-wrapper .code-copy-btn') : null;
			if (!copyBtn) return;

			e.preventDefault();
			e.stopPropagation();

			const wrapper = copyBtn.closest('.code-block-wrapper');
			let codeText = '';
			if (wrapper) {
				const codeEl = wrapper.querySelector('pre code');
				if (codeEl) {
					codeText = codeEl.textContent || codeEl.innerText || '';
				}
			}

			if (codeText) {
				this.copySolution(codeText, '代码块内容已成功复制到剪贴板');
				const origHtml = copyBtn.innerHTML;
				copyBtn.innerHTML = '<i class="el-icon-check"></i> 已复制';
				copyBtn.classList.add('copied');
				setTimeout(() => {
					copyBtn.innerHTML = origHtml;
					copyBtn.classList.remove('copied');
				}, 2000);
			} else {
				this.showToast('无法提取代码块内容');
			}
		},
		checkMobile() {
			this.isMobile = window.innerWidth <= 768;
			if (this.isMobile) {
				this.sidebarCollapsed = true;
			}
		},
		handleResize() {
			this.checkMobile();
			this.updateScrollMarkers();
		},

		getMimeType(filename) {
			const ext = this.getFileExt(filename).toLowerCase();
			const mimeMap = {
				'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'doc': 'application/msword',
				'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'xls': 'application/vnd.ms-excel',
				'pdf': 'application/pdf',
				'png': 'image/png',
				'jpg': 'image/jpeg',
				'jpeg': 'image/jpeg',
				'gif': 'image/gif',
				'txt': 'text/plain;charset=utf-8',
				'zip': 'application/zip',
				'rar': 'application/x-rar-compressed',
				'7z': 'application/x-7z-compressed'
			};
			return mimeMap[ext] || 'application/octet-stream';
		},

		async getFileBlob(file) {
			if (!file) return null;
			if (file.blob && file.blob instanceof Blob && file.blob.size > 0) {
				return file.blob;
			}

			const fileId = file.id || file.file_id || '';
			const mimeType = this.getMimeType(file.name || '');

			const sign = encodeURIComponent(localStorage.getItem('sign') || '');
			const uid = encodeURIComponent(localStorage.getItem('uid') || '');

			let downloadUrl = `${baseUrl}/v1/download-file?sign=${sign}&uid=${uid}`;
			if (fileId) {
				downloadUrl += `&file_id=${encodeURIComponent(fileId)}&id=${encodeURIComponent(fileId)}`;
			}
			if (file.name) {
				downloadUrl += `&name=${encodeURIComponent(file.name)}&file_name=${encodeURIComponent(file.name)}`;
			}
			if (file.url && typeof file.url === 'string' && !file.url.startsWith('blob:')) {
				downloadUrl += `&file_url=${encodeURIComponent(file.url)}`;
			}

			try {
				const response = await fetch(downloadUrl, {
					method: 'GET'
				});

				if (!response.ok) {
					console.warn(`接口请求未成功 (HTTP ${response.status})，尝试直连拉取:`, file.url);
					if (file.url && typeof file.url === 'string' && !file.url.startsWith('blob:')) {
						const fallbackRes = await fetch(file.url);
						if (fallbackRes.ok) {
							const fallbackBlob = await fallbackRes.blob();
							return fallbackBlob.slice(0, fallbackBlob.size, mimeType);
						}
					}
					return null;
				}

				const rawBlob = await response.blob();
				if (!rawBlob || rawBlob.size === 0) {
					console.warn('下载接口返回了空字节数据 (0 bytes)');
					return null;
				}

				return rawBlob.slice(0, rawBlob.size, mimeType || rawBlob.type || 'application/octet-stream');
			} catch (err) {
				console.error('getFileBlob fetch 网络请求失败:', err);
				return null;
			}
		},

		isOfficeDoc(filename) {
			if (!filename) return false;
			const ext = this.getFileExt(filename).toLowerCase();
			return ['doc', 'docx', 'xls', 'xlsx'].includes(ext);
		},

		openAttachmentContextMenu(file, prob, event) {
			this.contextMenuFile = file;
			this.contextMenuProb = prob;
			this.contextMenuStyle = {
				top: `${event.clientY}px`,
				left: `${event.clientX}px`
			};
			this.contextMenuVisible = true;
		},

		closeContextMenu() {
			this.contextMenuVisible = false;
		},

		handleContextMenuAction(action) {
			if (!this.contextMenuFile) return;
			const file = this.contextMenuFile;
			const prob = this.contextMenuProb;
			this.closeContextMenu();

			if (action === 'preview') {
				this.previewAttachment(file, prob);
			} else if (action === 'download') {
				this.downloadFile(file);
			} else if (action === 'svn') {
				this.openSvnForAttachment(file, prob);
			}
		},

		async downloadFile(attachment) {
			if (!attachment) {
				this.showToast('附件信息不存在');
				return;
			}

			this.showToast('正在获取完整文件，请稍候...');
			try {
				const blob = await this.getFileBlob(attachment);
				if (!blob || blob.size === 0) {
					this.showToast('获取附件文件失败，数据可能为空或无权限');
					return;
				}
				const filename = attachment.name || '附件文件';
				this.downloadBlob(blob, filename);
				this.showToast('附件已成功触发下载');
			} catch (e) {
				console.error('downloadFile error:', e);
				this.showToast('文件下载出现异常');
			}
		},

		openSvnForAttachment(file, prob) {
			this.svnTargetProblem = prob;
			this.svnTargetFile = file;
			this.svnForm.action = 'commit_file';
			this.svnForm.commitMsg = `提交附件文件: ${file.name}`;
			
			let baseRepoUrl = localStorage.getItem('svn_last_repo_url') || 'http://192.168.1.100/svn/repo/';

			if (/\.[a-zA-Z0-9]+$/i.test(baseRepoUrl)) {
				baseRepoUrl = baseRepoUrl.substring(0, baseRepoUrl.lastIndexOf('/') + 1);
			}

			if (!baseRepoUrl.endsWith('/')) {
				baseRepoUrl += '/';
			}

			this.svnForm.repoUrl = baseRepoUrl;

			this.svnDialogVisible = true;
			this.$nextTick(() => {
				this.$refs.svnFormRef && this.$refs.svnFormRef.clearValidate();
			});
		},

		async submitSvnAction() {
			this.$refs.svnFormRef.validate(async valid => {
				if (!valid) return;

				this.svnSubmitting = true;
				const { action, repoUrl, username, password, commitMsg } = this.svnForm;
				let rawUrl = repoUrl.trim();

				localStorage.setItem('svn_last_repo_url', rawUrl);
				localStorage.setItem('svn_last_username', username);

				try {
					let parentDirectoryUrl = rawUrl;
					if (/\.[a-zA-Z0-9]+$/i.test(parentDirectoryUrl)) {
						parentDirectoryUrl = parentDirectoryUrl.substring(0, parentDirectoryUrl.lastIndexOf('/') + 1);
					}
					if (!parentDirectoryUrl.endsWith('/')) {
						parentDirectoryUrl += '/';
					}

					const authHeader = 'Basic ' + this.encodeBase64(username + ':' + password);

					if (action === 'commit_file') {
						if (!this.svnTargetFile) {
							Message.error('无法获取附件文件信息');
							this.svnSubmitting = false;
							return;
						}

						const targetFileName = this.svnTargetFile.name;
						const targetFileUrl = parentDirectoryUrl + encodeURIComponent(targetFileName);

						const fileBlob = await this.getFileBlob(this.svnTargetFile);
						if (!fileBlob) {
							Message.error('获取文件完整数据失败');
							this.svnSubmitting = false;
							return;
						}

						try {
							const svnPutResp = await fetch(targetFileUrl, {
								method: 'PUT',
								headers: {
									'Authorization': authHeader,
									'Content-Type': fileBlob.type || 'application/octet-stream'
								},
								body: fileBlob
							});

							if (svnPutResp.status >= 200 && svnPutResp.status < 300) {
								Message.success(`附件文件【${targetFileName}】已成功直连写入 SVN 仓库！`);
								this.svnDialogVisible = false;
								return;
							}
						} catch (netErr) {
							console.warn('WebDAV 直连受限，准备尝试后端 API 提交:', netErr);
						}

						let fileBase64 = '';
						try {
							fileBase64 = await new Promise((resolve) => {
								const reader = new FileReader();
								reader.onload = (e) => resolve(e.target.result);
								reader.onerror = () => resolve('');
								reader.readAsDataURL(fileBlob);
							});
						} catch (bErr) {
							console.warn('读取 Base64 失败:', bErr);
						}

						const apiResp = await fetch('/api/svn-commit-docx', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								repoUrl: parentDirectoryUrl,
								username: username,
								password: password,
								commitMsg: commitMsg || `提交附件文件 ${targetFileName}`,
								title: targetFileName,
								fileName: targetFileName,
								filename: targetFileName,
								isAttachment: true,
								fileBase64: fileBase64,
								solution: fileBase64
							})
						});

						if (apiResp.status === 405 || apiResp.status === 404) {
							throw new Error(`直连 SVN 失败(可能因跨域限制)，且当前生产环境未配置后端 /api/svn-commit-docx 代理服务 (HTTP ${apiResp.status})。请在 SVN 服务器开启 CORS 允许前端直连提交。`);
						}

						const contentType = apiResp.headers.get('content-type') || '';
						if (contentType.includes('application/json')) {
							const res = await apiResp.json();
							if (res && (res.code === 1000 || res.code === 200)) {
								Message.success(`附件文件【${targetFileName}】已成功提交至 SVN 仓库！`);
								this.svnDialogVisible = false;
								return;
							} else {
								Message.error(res.msg || '后端 SVN 提交失败');
							}
						} else {
							Message.error(`SVN 提交失败，请检查 SVN 仓库地址或账号权限 (HTTP ${apiResp.status})`);
						}
					} 
					else if (action === 'commit') {
						if (!this.svnTargetProblem) return;

						const safeTitle = (this.svnTargetProblem.title || '排错文档').replace(/[\/\\:*?"<>|]/g, '_');
						const targetFileName = safeTitle.endsWith('.docx') ? safeTitle : `${safeTitle}.docx`;
						const targetFileUrl = parentDirectoryUrl + encodeURIComponent(targetFileName);

						const plainText = this.convertMarkdownToPlainText(this.svnTargetProblem.solution);
						const wordHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
            <head><meta charset='utf-8'></head>
            <body style="font-family: Microsoft YaHei, Arial; font-size: 11pt; line-height: 1.6;">
              <h2>${this.svnTargetProblem.title}</h2>
              <pre style="font-family: Consolas, monospace; background: #f8fafc; padding: 10px; white-space: pre-wrap; word-break: break-all;">${plainText}</pre>
            </body>
            </html>`;

						const docBlob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' });

						try {
							const svnPutResp = await fetch(targetFileUrl, {
								method: 'PUT',
								headers: {
									'Authorization': authHeader,
									'Content-Type': 'application/msword;charset=utf-8'
								},
								body: docBlob
							});

							if (svnPutResp.status >= 200 && svnPutResp.status < 300) {
								Message.success(`文档【${targetFileName}】已成功直连写入 SVN 仓库！`);
								this.svnDialogVisible = false;
								return;
							}
						} catch (netErr) {
							console.warn('WebDAV 直连提交受限，准备尝试后端 API:', netErr);
						}

						const response = await fetch('/api/svn-commit-docx', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								repoUrl: parentDirectoryUrl,
								username: username,
								password: password,
								title: this.svnTargetProblem.title,
								solution: plainText,
								commitMsg: commitMsg || '提交排错文档 .docx'
							})
						});

						if (response.status === 405 || response.status === 404) {
							throw new Error(`直连 SVN 失败(可能因跨域限制)，且当前生产环境未配置后端 /api/svn-commit-docx 代理服务 (HTTP ${response.status})。请在 SVN 服务器开启 CORS 允许前端直连提交。`);
						}

						const contentType = response.headers.get('content-type') || '';
						let res;
						if (contentType.includes('application/json')) {
							res = await response.json();
						} else {
							throw new Error(`接口响应非 JSON 格式 (HTTP ${response.status})`);
						}

						if (res && (res.code === 1000 || res.code === 200)) {
							Message.success(`文档【${targetFileName}】已成功提交至 VisualSVN 仓库！`);
							this.svnDialogVisible = false;
						} else {
							Message.error(res.msg || 'SVN 提交失败，请检查命令行或权限');
						}
					} 
					else if (action === 'pull') {
						Message.info('拉取模式已准备就绪');
					}
				} catch (err) {
					console.error('SVN action error:', err);
					Message.error('提交请求失败：' + (err.message || '网络连接超时'));
				} finally {
					this.svnSubmitting = false;
				}
			});
		},

		decodeQuotedPrintable(str) {
			if (!str || typeof str !== 'string') return '';
			if (!str.includes('=3D') && !/=([0-9A-F]{2})/i.test(str)) return str;
			try {
				let cleaned = str.replace(/=\r?\n/g, '');
				let percentEncoded = cleaned.replace(/=([0-9A-F]{2})/gi, '%$1');
				return decodeURIComponent(percentEncoded);
			} catch (e) {
				return str.replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
			}
		},

		encodeBase64(str) {
			try {
				return window.btoa(unescape(encodeURIComponent(str)));
			} catch (e) {
				return window.btoa(str);
			}
		},

		handleSvnCommand(cmd, prob) {
			this.svnTargetProblem = prob;
			this.svnTargetFile = null; 
			this.svnForm.action = cmd;
			this.svnForm.commitMsg = cmd === 'commit' ? `同步更新文档: ${prob.title}` : '';
			this.svnDialogVisible = true;
			this.$nextTick(() => {
				this.$refs.svnFormRef && this.$refs.svnFormRef.clearValidate();
			});
		},

		openExportFormatDialog(mode, prob = null) {
			if (this.$refs.exportPopover) {
				this.$refs.exportPopover.doClose();
			}
			this.exportMode = mode;
			this.exportTargetProb = prob;
			this.exportFormatDialogVisible = true;
		},

		confirmExport() {
			let targetProblems = [];
			if (this.exportMode === 'all') {
				targetProblems = this.currentProblems;
			} else if (this.exportMode === 'selected') {
				targetProblems = this.problems.filter(p => this.selectedProblemIds.includes(p.id));
			} else if (this.exportMode === 'single' && this.exportTargetProb) {
				targetProblems = [this.exportTargetProb];
			}

			if (targetProblems.length === 0) {
				Message.info('没有可导出的记录');
				this.exportFormatDialogVisible = false;
				return;
			}

			let fileName = `${this.currentCategoryName}_排错手册`;
			if (this.exportMode === 'selected') {
				fileName = '自定义选择_组合排错手册';
			} else if (this.exportMode === 'single' && this.exportTargetProb) {
				fileName = this.exportTargetProb.title;
			}

			this.processDocumentExport(targetProblems, fileName, this.selectedExportFormat);
			this.exportFormatDialogVisible = false;

			if (this.exportMode === 'selected') {
				this.isBatchMode = false;
				this.selectedProblemIds = [];
			}
		},

		processDocumentExport(targetProblems, fileName, format) {
			if (format === 'md') {
				let mdContent = `# 故障排错手册 - TroubleDocs\n\n`;
				mdContent += `> 自动生成时间：${new Date().toLocaleString()}\n> 共计收录 ${targetProblems.length} 条记录\n\n---\n\n`;

				targetProblems.forEach((prob, idx) => {
					const catName = this.getCategoryName(prob.categoryId);
					const creatorName = prob.creator ? prob.creator.username : '未知';
					const updaterName = prob.updatedBy ? prob.updatedBy.username : creatorName;
					mdContent += `## ${idx + 1}. [${catName}] ${prob.title}\n`;
					mdContent += `*创建者：${creatorName} | 最近修改：${updaterName} | 更新时间：${prob.updatedAt || getNowDate()}*\n\n`;
					mdContent += `**排查思路与解决方案：**\n\n\`\`\`bash\n${prob.solution}\n\`\`\`\n\n---\n\n`;
				});

				const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
				this.downloadBlob(blob, `${fileName}.md`);
			} else if (format === 'doc' || format === 'docx') {
				let textBlocks = [];
				targetProblems.forEach((prob, idx) => {
					const plainText = this.convertMarkdownToPlainText(prob.solution);
					if (targetProblems.length > 1) {
						textBlocks.push(`【记录 ${idx + 1}】 ${prob.title}\n----------------------------------------\n${plainText}\n`);
					} else {
						textBlocks.push(plainText);
					}
				});

				const combinedPlainText = textBlocks.join('\n\n========================================\n\n');
				
				const wordHtml = `
					<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
					<head>
						<meta charset='utf-8'>
						<title>${fileName}</title>
						<style>
							body { font-family: Microsoft YaHei, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; }
							h2 { font-size: 16pt; color: #0ea5e9; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; }
							pre { font-family: Consolas, Courier New, monospace; background-color: #f8fafc; padding: 10pt; border: 1px solid #e2e8f0; white-space: pre-wrap; word-wrap: break-word; }
						</style>
					</head>
					<body>
						${targetProblems.length === 1 ? `<h2>${targetProblems[0].title}</h2>` : ''}
						<pre>${combinedPlainText}</pre>
					</body>
					</html>
				`;

				const mimeType = format === 'docx' 
					? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
					: 'application/msword';

				const blob = new Blob(['\ufeff' + wordHtml], { type: `${mimeType};charset=utf-8` });
				this.downloadBlob(blob, `${fileName}.${format}`);
			}
			this.showToast(`文件【${fileName}.${format}】已生成并下载！`);
		},

		downloadBlob(blob, fullFilename) {
			if (!blob || blob.size === 0) {
				this.showToast('无法下载空文件');
				return;
			}
			if (window.navigator && window.navigator.msSaveOrOpenBlob) {
				window.navigator.msSaveOrOpenBlob(blob, fullFilename);
				return;
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.style.display = 'none';
			link.href = url;
			link.setAttribute('download', fullFilename);
			
			if (typeof link.download === 'undefined') {
				link.setAttribute('target', '_blank');
			}

			document.body.appendChild(link);
			link.click();
			
			setTimeout(() => {
				if (document.body.contains(link)) {
					document.body.removeChild(link);
				}
				URL.revokeObjectURL(url);
			}, 5000);
		},

		loadScript(url) {
			return new Promise((resolve, reject) => {
				if (document.querySelector(`script[src="${url}"]`)) {
					resolve();
					return;
				}
				const script = document.createElement('script');
				script.src = url;
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
		},

		getFileExt(filename) {
			if (!filename) return '';
			const parts = filename.split('.');
			return parts.length > 1 ? parts.pop().toLowerCase() : '';
		},

		getFileType(filename) {
			const ext = this.getFileExt(filename);
			if (['xlsx', 'xls'].includes(ext)) return 'office_excel';
			if (['docx', 'doc'].includes(ext)) return 'office_word';
			if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
			if (ext === 'pdf') return 'pdf';
			if (['txt', 'log', 'md', 'json', 'js', 'ts', 'css', 'html', 'py', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) return 'text';
			return 'other';
		},

		async previewAttachment(file, problemContext = null) {
			if (!file) {
				this.showToast('附件信息不完整');
				return;
			}

			this.previewLoading = true;
			this.previewDialogVisible = true;
			this.currentProblemOfPreview = problemContext;
			this.previewFileType = this.getFileType(file.name);
			this.previewContent = '';
			this.excelData = [];
			this.wordContent = '';
			this.wordEmbeddedFiles = [];
			this.isEditMode = false;

			try {
				const blob = await this.getFileBlob(file);
				if (!blob || blob.size === 0) {
					this.showToast('无法获取附件完整数据，请检查网络或重新登录');
					this.previewLoading = false;
					return;
				}

				const objectUrl = URL.createObjectURL(blob);
				this.previewFile = {
					...file,
					url: objectUrl,
					blob: blob
				};

				if (this.previewFileType === 'office_word') {
					await this.parseWordBlob(blob);
				} else if (this.previewFileType === 'office_excel') {
					await this.parseExcelBlob(blob);
				} else if (this.previewFileType === 'text') {
					this.previewContent = await blob.text();
				}
			} catch (e) {
				console.error('previewAttachment error:', e);
				this.showToast('文件预览解析出现异常');
			} finally {
				this.previewLoading = false;
			}
		},

		async parseWordBlob(blob) {
			const ext = this.getFileExt(this.previewFile ? this.previewFile.name : '');
			const ab = await blob.arrayBuffer();

			await this.extractWordEmbeddings(ab);

			try {
				const textDecoder = new TextDecoder('utf-8');
				let rawText = textDecoder.decode(ab).trim();
				rawText = this.decodeQuotedPrintable(rawText);

				if (
					rawText.startsWith('<') || 
					rawText.startsWith('\ufeff<') || 
					rawText.toLowerCase().includes('<html') || 
					rawText.toLowerCase().includes('<body') || 
					rawText.toLowerCase().includes('xmlns:w=')
				) {
					let bodyHtml = rawText;
					const bodyMatch = rawText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
					if (bodyMatch && bodyMatch[1]) {
						bodyHtml = bodyMatch[1].trim();
					}
					this.wordContent = bodyHtml;
					return;
				}
			} catch (tErr) {
				console.warn('HTML 文本格式检测异常:', tErr);
			}

			if (ext === 'doc') {
				this.wordContent = '<p class="fallback-tip" style="padding: 16px; color: #f59e0b; font-weight: 500;"><i class="el-icon-info"></i> .doc 属于旧版二进制格式。建议点击右下角“下载原文件”在本地打开，或转换为 .docx 格式后重新上传。</p>';
				return;
			}

			try {
				await this.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
				await this.loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
			} catch (e) {
				console.warn('加载 Mammoth 解析库失败:', e);
			}

			let htmlResult = '';
			let xmlStyles = [];
			try {
				xmlStyles = await this.parseWordXmlStyles(ab);
			} catch (e) {}

			if (window.mammoth && ab && ab.byteLength > 0) {
				try {
					const customStyleMap = [
						"p[alignment='center'] => p.align-center:fresh",
						"p[alignment='right'] => p.align-right:fresh",
						"p[alignment='justify'] => p.align-justify:fresh",
						"p[alignment='left'] => p.align-left:fresh",
						"p[style-name='标题 1'] => h1:fresh",
						"p[style-name='标题 2'] => h2:fresh",
						"p[style-name='Heading 1'] => h1:fresh",
						"p[style-name='Heading 2'] => h2:fresh"
					];
					const result = await window.mammoth.convertToHtml({ arrayBuffer: ab }, { styleMap: customStyleMap, includeDefaultStyleMap: true });
					htmlResult = result.value || '';
				} catch (mErr) {
					console.warn('带 StyleMap 转换失败，准备重试无配置模式:', mErr);
					try {
						const defaultResult = await window.mammoth.convertToHtml({ arrayBuffer: ab });
						htmlResult = defaultResult.value || '';
					} catch (dErr) {
						console.warn('默认 Mammoth 转换失败:', dErr);
					}
				}

				if (!htmlResult) {
					try {
						const rawTextRes = await window.mammoth.extractRawText({ arrayBuffer: ab });
						if (rawTextRes && rawTextRes.value) {
							htmlResult = rawTextRes.value.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
						}
					} catch (rErr) {
						console.warn('Mammoth extractRawText 失败:', rErr);
					}
				}
			}

			if (htmlResult) {
				htmlResult = this.decodeQuotedPrintable(htmlResult);
				htmlResult = this.applyWordFormatting(htmlResult, xmlStyles);
				this.wordContent = htmlResult;
			} else {
				this.wordContent = '';
				this.$nextTick(async () => {
					await this.tryDocxPreviewRender(ab);
				});
			}
		},

		async tryDocxPreviewRender(ab) {
			try {
				await this.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
				await this.loadScript('https://cdn.jsdelivr.net/npm/docx-preview@0.1.15/dist/docx-preview.min.js');

				if (window.docx && this.$refs.docxPreviewBox) {
					this.$refs.docxPreviewBox.innerHTML = '';
					await window.docx.renderAsync(ab, this.$refs.docxPreviewBox, null, {
						inWrapper: false,
						ignoreWidth: false,
						ignoreHeight: false
					});
					return true;
				}
			} catch (e) {
				console.warn('docx-preview 渲染失败:', e);
			}

			this.wordContent = `
				<div style="padding: 24px; text-align: center; color: var(--text-muted);">
					<i class="el-icon-document-remove" style="font-size: 36px; margin-bottom: 8px; color: var(--primary-blue);"></i>
					<p style="font-size: 14px; margin: 8px 0; color: var(--text-h1); font-weight: 600;">暂无法在线提取该 Word 文档的正文排版</p>
					<p style="font-size: 12px; margin: 0;">文档可能包含复杂的加密宏或为非标准格式，建议直接点击下方按钮下载后在本地打开查看。</p>
				</div>
			`;
			return false;
		},

		async parseExcelBlob(blob) {
			try {
				await this.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
				const arrayBuffer = await blob.arrayBuffer();
				const wb = window.XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
				if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
					const firstSheetName = wb.SheetNames[0];
					const worksheet = wb.Sheets[firstSheetName];
					const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

					if (jsonData && jsonData.length > 0) {
						let maxCols = 0;
						jsonData.forEach(row => { if (row.length > maxCols) maxCols = row.length; });
						this.excelData = jsonData.map(row => {
							const newRow = row.map(v => (v === null || v === undefined) ? '' : String(v));
							while (newRow.length < Math.max(maxCols, 3)) { newRow.push(''); }
							return newRow;
						});
						return;
					}
				}
			} catch (e) {
				console.error('parseExcelBlob error:', e);
			}
			this.excelData = [];
		},

		async extractWordEmbeddings(arrayBuffer) {
			this.wordEmbeddedFiles = [];
			try {
				await this.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
				if (window.JSZip) {
					const zip = await window.JSZip.loadAsync(arrayBuffer);
					const embeddingFiles = zip.file(/^word\/embeddings\//);
					const list = [];
					for (const file of embeddingFiles) {
						if (file.dir) continue;
						let rawName = file.name.replace('word/embeddings/', '');
						if (rawName.startsWith('oleObject')) {
							rawName = 'Word内嵌文件_' + rawName.replace('oleObject', '').replace('.bin', '') + '.bin';
						}
						const blob = await file.async('blob');
						list.push({
							name: rawName,
							blob: blob,
							size: (blob.size / 1024).toFixed(1) + ' KB'
						});
					}
					this.wordEmbeddedFiles = list;
				}
			} catch (e) {
				console.warn('解压提取 Word 内嵌附件失败:', e);
			}
		},

		execWordCmd(cmd, value = null) {
			document.execCommand(cmd, false, value);
			if (this.$refs.wordEditableBox) {
				this.wordContent = this.decodeQuotedPrintable(this.$refs.wordEditableBox.innerHTML);
			}
		},

		onWordContentInput(e) {
			this.wordContent = this.decodeQuotedPrintable(e.target.innerHTML);
		},

		async parseWordXmlStyles(arrayBuffer) {
			const paragraphStyles = [];
			try {
				await this.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
				if (window.JSZip && arrayBuffer) {
					const zip = await window.JSZip.loadAsync(arrayBuffer);
					const docXmlFile = zip.file("word/document.xml");
					if (docXmlFile) {
						const xmlText = await docXmlFile.async("text");
						const parser = new DOMParser();
						const xmlDoc = parser.parseFromString(xmlText, "application/xml");
						const pNodes = xmlDoc.getElementsByTagName("w:p");
						for (let i = 0; i < pNodes.length; i++) {
							const p = pNodes[i];
							const pPr = p.getElementsByTagName("w:pPr")[0];
							let align = null;
							let firstLineIndent = null;
							let leftIndent = null;

							if (pPr) {
								const jc = pPr.getElementsByTagName("w:jc")[0];
								if (jc) {
									align = jc.getAttribute("w:val");
								}
								const ind = pPr.getElementsByTagName("w:ind")[0];
								if (ind) {
									const fl = ind.getAttribute("w:firstLine");
									const flChars = ind.getAttribute("w:firstLineChars");
									const left = ind.getAttribute("w:left");
									const leftChars = ind.getAttribute("w:leftChars");

									if (fl) {
										const pt = Math.round(parseInt(fl, 10) / 20);
										if (!isNaN(pt) && pt > 0) firstLineIndent = `${pt}pt`;
									} else if (flChars) {
										const chars = parseInt(flChars, 10) / 100;
										if (!isNaN(chars) && chars > 0) firstLineIndent = `${chars}em`;
									}

									if (left) {
										const pt = Math.round(parseInt(left, 10) / 20);
										if (!isNaN(pt) && pt > 0) leftIndent = `${pt}pt`;
									} else if (leftChars) {
										const chars = parseInt(leftChars, 10) / 100;
										if (!isNaN(chars) && chars > 0) leftIndent = `${chars}em`;
									}
								}
							}
							paragraphStyles.push({ align, firstLineIndent, leftIndent });
						}
					}
				}
			} catch (e) {
				console.warn('解析 Word XML 格式属性异常:', e);
			}
			return paragraphStyles;
		},

		applyWordFormatting(htmlResult, xmlStyles = []) {
			if (!htmlResult) return htmlResult;
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = htmlResult;

			const alignClasses = ['align-center', 'align-right', 'align-justify', 'align-left'];
			alignClasses.forEach(cls => {
				const alignVal = cls.replace('align-', '');
				const nodes = tempDiv.querySelectorAll('.' + cls);
				nodes.forEach(node => {
					node.style.textAlign = alignVal;
				});
			});

			if (xmlStyles && xmlStyles.length > 0) {
				const blockElems = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li');
				blockElems.forEach((elem, idx) => {
					const styleObj = xmlStyles[idx];
					if (styleObj) {
						if (styleObj.align && (!elem.style.textAlign || elem.style.textAlign === 'initial')) {
							elem.style.textAlign = styleObj.align;
						}
						if (styleObj.firstLineIndent && !elem.style.textIndent) {
							elem.style.textIndent = styleObj.firstLineIndent;
						}
						if (styleObj.leftIndent && !elem.style.marginLeft) {
							elem.style.marginLeft = styleObj.leftIndent;
						}
					}
				});
			}

			return tempDiv.innerHTML;
		},

		async handleToggleEditMode(val) {
			if (!val || !this.previewFile) return;

			this.previewLoading = true;
			try {
				const blob = await this.getFileBlob(this.previewFile);
				if (!blob) throw new Error('获取完整 Blob 数据失败');

				if (this.previewFileType === 'office_excel') {
					if (!this.excelData || this.excelData.length === 0) {
						await this.parseExcelBlob(blob);
					}
				}
				else if (this.previewFileType === 'office_word') {
					const ext = this.getFileExt(this.previewFile.name);
					if (ext === 'doc') {
						this.showToast('.doc 老版本格式不支持在线编辑，请先转换为 .docx 格式重新上传');
						this.isEditMode = false;
						this.previewLoading = false;
						return;
					}

					if (!this.wordContent || this.wordContent.includes('暂无法在线提取')) {
						await this.parseWordBlob(blob);
					}

					this.$nextTick(() => {
						if (this.$refs.wordEditableBox) {
							this.$refs.wordEditableBox.innerHTML = this.wordContent;
						}
					});
				}
				else if (this.previewFileType === 'text') {
					if (!this.previewContent) {
						this.previewContent = await blob.text();
					}
				}
			} catch (e) {
				console.error('handleToggleEditMode error:', e);
				this.showToast('读取内存文件失败，建议直接下载到本地查看');
				this.isEditMode = false;
			} finally {
				this.previewLoading = false;
			}
		},

		addExcelRow() {
			if (this.excelData.length > 0) {
				const colCount = this.excelData[0].length;
				this.excelData.push(new Array(colCount).fill(''));
			} else {
				this.excelData.push(['', '', '']);
			}
		},

		deleteExcelRow(rIdx) {
			if (this.excelData.length <= 1) {
				this.showToast('至少保留一行表格数据');
				return;
			}
			this.excelData.splice(rIdx, 1);
		},

		async saveOfficeFile() {
			if (!this.previewFile || !this.currentProblemOfPreview) {
				this.showToast('无法定位所属记录，保存失败');
				return;
			}

			if (!this.canManageShare(this.currentProblemOfPreview)) {
				this.showToast('仅问题创建者允许在线保存覆盖附件');
				return;
			}

			this.previewLoading = true;
			try {
				let newBlob = null;
				let filename = this.previewFile.name;

				if (this.previewFileType === 'office_excel') {
					await this.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
					const ws = window.XLSX.utils.aoa_to_sheet(this.excelData);
					const wb = window.XLSX.utils.book_new();
					window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
					const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
					newBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
					if (!filename.endsWith('.xlsx')) filename = filename.replace(/\.[^/.]+$/, "") + ".xlsx";
				}
				else if (this.previewFileType === 'office_word') {
					try {
						await this.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
						await this.loadScript('https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.min.js');
					} catch (e) {
						console.warn('加载 docx 导出库失败:', e);
					}

					let currentHtml = this.wordContent;
					if (this.$refs.wordEditableBox) {
						currentHtml = this.$refs.wordEditableBox.innerHTML;
					}
					currentHtml = this.decodeQuotedPrintable(currentHtml);
					this.wordContent = currentHtml;

					const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
					<style>
						body { font-family: "Microsoft YaHei", "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; }
						h1 { font-size: 18pt; font-weight: bold; color: #0f172a; margin-top: 16pt; margin-bottom: 8pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; }
						h2 { font-size: 15pt; font-weight: bold; color: #0ea5e9; margin-top: 14pt; margin-bottom: 6pt; }
						h3 { font-size: 13pt; font-weight: bold; color: #334155; margin-top: 12pt; margin-bottom: 4pt; }
						p { margin: 6pt 0; }
						p.toc-item { margin: 4pt 0; font-family: "Microsoft YaHei", sans-serif; }
						p.toc-1 { font-weight: bold; margin-left: 0; color: #0f172a; }
						p.toc-2 { margin-left: 18pt; color: #334155; }
						p.toc-3 { margin-left: 36pt; color: #64748b; font-size: 10pt; }
						table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
						td, th { border: 1px solid #cbd5e1; padding: 6pt 8pt; }
						th { background-color: #f1f5f9; font-weight: bold; }
						blockquote { border-left: 4px solid #0ea5e9; padding-left: 10pt; margin: 8pt 0; color: #64748b; }
					</style>
					</head><body>${currentHtml}</body></html>`;

					if (window.htmlDocx && typeof window.htmlDocx.asBlob === 'function') {
						newBlob = window.htmlDocx.asBlob(fullHtml);
						if (!filename.toLowerCase().endsWith('.docx')) {
							filename = filename.replace(/\.[^/.]+$/, "") + ".docx";
						}
					} else {
						newBlob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
						if (!filename.toLowerCase().endsWith('.doc') && !filename.toLowerCase().endsWith('.docx')) {
							filename = filename.replace(/\.[^/.]+$/, "") + ".doc";
						}
					}
				}
				else if (this.previewFileType === 'text') {
					newBlob = new Blob([this.previewContent], { type: 'text/plain;charset=utf-8' });
				}

				if (!newBlob) return;

				const newFile = new File([newBlob], filename, { type: newBlob.type });

				await del_doc({ id: this.currentProblemOfPreview.id, file_id: this.previewFile.id || this.previewFile.file_id });

				const formData = new FormData();
				formData.append('file', newFile, filename);
				formData.append('problem_id', this.currentProblemOfPreview.id);
				formData.append('name', filename);

				const resp = await upload_doc(formData);
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.url)) {
					const fileData = (res.data && res.data.url) ? res.data : res;

					const prob = this.problems.find(p => p.id === this.currentProblemOfPreview.id);
					if (prob && prob.attachments) {
						const targetFileId = this.previewFile.id || this.previewFile.file_id;
						const idx = prob.attachments.findIndex(a => (a.id || a.file_id) === targetFileId || a.name === filename);
						const updatedAttachment = {
							id: fileData.id || fileData.file_id,
							name: fileData.name || filename,
							url: fileData.url,
							uploader: fileData.uploader || null
						};
						if (idx !== -1) {
							prob.attachments.splice(idx, 1, updatedAttachment);
						} else {
							prob.attachments.push(updatedAttachment);
						}
						this.previewFile = updatedAttachment;
					}
					this.showToast('文件已被成功覆盖保存！');
					this.isEditMode = false;
				} else {
					this.showToast(res?.msg || '新文件覆盖保存失败');
				}
			} catch (e) {
				console.error('saveOfficeFile error:', e);
				this.showToast('在线保存文件发生异常');
			} finally {
				this.previewLoading = false;
			}
		},

		resetPreview() {
			if (this.previewFile && this.previewFile.url && this.previewFile.url.startsWith('blob:')) {
				URL.revokeObjectURL(this.previewFile.url);
			}
			this.previewFile = null;
			this.currentProblemOfPreview = null;
			this.previewFileType = '';
			this.previewContent = '';
			this.excelData = [];
			this.wordContent = '';
			this.wordEmbeddedFiles = [];
			this.isEditMode = false;
			this.previewLoading = false;
		},

		async fetchUserList() {
			this.userListLoading = true;
			try {
				if (typeof get_users === 'function') {
					const resp = await get_users();
					const res = resp?.data?.code !== undefined ? resp.data : resp;
					if (res && (res.code === 1000 || res.code === 200)) {
						const dataObj = res.data || {};
						const list = Array.isArray(dataObj.list) ? dataObj.list : (Array.isArray(dataObj) ? dataObj : []);
						if (list.length > 0) {
							this.userList = list;
							return;
						}
					}
				}
			} catch (e) {
				console.warn('get_users API 请求异常:', e);
			} finally {
				this.userListLoading = false;
			}

			if (!this.userList || this.userList.length === 0) {
				this.userList = [
					{ id: 1, username: 'admin' },
					{ id: 2, username: 'zhangsan' }
				];
			}
		},

		async openShareDialog(type, item) {
			if (!this.canManageShare(item)) {
				this.showToast('仅创建者有权修改共享设置');
				return;
			}
			this.safeClosePopover(item.id);
			
			this.shareTargetType = type;
			this.shareTargetItem = item;
			this.searchUserQuery = '';

			const sharedUsers = item.sharedUsers || item.shared_users || [];
			this.selectedShareUserIds = sharedUsers.map(u => u.id);

			this.shareDialogVisible = true;
			await this.fetchUserList();
		},

		handleSelectAllUsers(val) {
			this.selectedShareUserIds = val ? this.filteredUserList.map(u => u.id) : [];
		},

		async confirmSaveShareSettings() {
			if (!this.shareTargetItem) return;

			const targetId = this.shareTargetItem.id;
			const isShared = this.selectedShareUserIds.length > 0;
			const selectedUserObjects = this.userList.filter(u => this.selectedShareUserIds.includes(u.id));

			this.apiLoading = true;
			try {
				if (this.shareTargetType === 'category') {
					let success = false;
					if (typeof update_category_share === 'function') {
						const resp = await update_category_share({
							category_id: targetId,
							target_user_ids: this.selectedShareUserIds
						});
						const res = resp?.data?.code !== undefined ? resp.data : resp;
						success = (res && (res.code === 1000 || res.code === 200));
					} else {
						const resp = await create_categories({
							id: targetId,
							name: this.shareTargetItem.name,
							is_shared: isShared,
							shared_user_ids: this.selectedShareUserIds
						});
						const res = resp?.data?.code !== undefined ? resp.data : resp;
						success = (res && res.code === 1000);
					}

					if (success) {
						this.$set(this.shareTargetItem, 'is_shared', isShared);
						this.$set(this.shareTargetItem, 'sharedUsers', selectedUserObjects);
						this.showToast(`分类【${this.shareTargetItem.name}】共享人员已更新 (${selectedUserObjects.length}人)`);
					} else {
						this.showToast('修改分类共享用户失败');
					}
				} 
				else if (this.shareTargetType === 'problem') {
					let success = false;
					if (typeof update_problem_share === 'function') {
						const resp = await update_problem_share({
							problem_id: targetId,
							target_user_ids: this.selectedShareUserIds
						});
						const res = resp?.data?.code !== undefined ? resp.data : resp;
						success = (res && (res.code === 1000 || res.code === 200));
					} else {
						const resp = await create_problems({
							id: targetId,
							category_id: this.shareTargetItem.categoryId,
							title: this.shareTargetItem.title,
							solution: this.shareTargetItem.solution,
							is_shared: isShared,
							shared_user_ids: this.selectedShareUserIds
						});
						const res = resp?.data?.code !== undefined ? resp.data : resp;
						success = (res && res.code === 1000);
					}

					if (success) {
						this.$set(this.shareTargetItem, 'isShared', isShared);
						this.$set(this.shareTargetItem, 'sharedUsers', selectedUserObjects);
						this.showToast(`文档【${this.shareTargetItem.title}】共享人员已更新 (${selectedUserObjects.length}人)`);
					} else {
						this.showToast('修改文档共享用户失败');
					}
				}
				this.shareDialogVisible = false;
			} catch (err) {
				console.error('save share settings error:', err);
				this.showToast('同步共享设置失败，网络请求异常');
			} finally {
				this.apiLoading = false;
			}
		},

		handleFilterSwitchChange(val) {
			localStorage.setItem('trouble_docs_only_my_cat', val ? 'true' : 'false');
			
			this.$nextTick(() => {
				if (this.filteredCategories.length > 0) {
					const isCurrentExist = this.filteredCategories.some(c => Number(c.id) === Number(this.activeCategoryId));
					if (!isCurrentExist) {
						this.selectCategory(this.filteredCategories[0].id);
					}
				} else {
					this.activeCategoryId = null;
					localStorage.removeItem('trouble_docs_active_cat_id');
				}
			});
		},

		triggerImportFile() {
			if (!this.canAddProblemInCurrentCategory) {
				this.showToast('他人共享给您的分类目录暂不支持导入故障文档');
				return;
			}
			this.$refs.importFileInput.click();
		},

		handleImportFileSelect(event) {
			const file = event.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target.result || '';
				let defaultTitle = file.name.replace(/\.[^/.]+$/, "");
				let defaultSolution = content;

				if (content.includes('TroubleDocs') || content.includes('排查思路与解决方案：')) {
					const titleMatch = content.match(/##\s*\d+\.\s*\[.*?\]\s*(.+)/);
					if (titleMatch && titleMatch[1]) {
						defaultTitle = titleMatch[1].trim();
					}

					const solutionSplit = content.split(/\*\*排查思路与解决方案：\*\*/);
					if (solutionSplit.length > 1) {
						let rawSolution = solutionSplit[1];
						const separatorIndex = rawSolution.search(/\n---\n|\n##\s/);
						if (separatorIndex !== -1) {
							rawSolution = rawSolution.substring(0, separatorIndex);
						}
						rawSolution = rawSolution.trim();

						const codeBlockMatch = rawSolution.match(/^```[a-zA-Z]*\r?\n([\s\S]*?)\r?\n```$/);
						if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
							defaultSolution = codeBlockMatch[1];
						} else {
							defaultSolution = rawSolution
								.replace(/^```[a-zA-Z]*\r?\n?/, '')
								.replace(/\r?\n?```$/, '')
								.trim();
						}
					}
				} else {
					const lines = content.split('\n');
					if (lines.length > 0 && lines[0].trim().startsWith('# ')) {
						defaultTitle = lines[0].trim().replace(/^#\s+/, '');
						defaultSolution = lines.slice(1).join('\n').trim();
					}
				}

				this.importForm = { title: defaultTitle, solution: defaultSolution };
				this.importDialogVisible = true;
				this.$nextTick(() => {
					this.$refs.importForm && this.$refs.importForm.clearValidate();
				});
				event.target.value = '';
			};

			reader.onerror = () => {
				this.showToast('文件读取失败，请检查文件格式');
				event.target.value = '';
			};

			reader.readAsText(file, 'UTF-8');
		},

		async confirmImportProblem() {
			this.$refs.importForm.validate(async valid => {
				if (valid) {
					this.apiLoading = true;
					try {
						await this.createProblems({
							categoryId: this.activeCategoryId,
							title: this.importForm.title.trim(),
							solution: this.importForm.solution.trim()
						});
						this.importDialogVisible = false;
						this.showToast('导入文档已成功发布！');
					} finally {
						this.apiLoading = false;
					}
				}
			});
		},

		handleProblemSearch() {
			const query = (this.searchProblemInput || '').trim();
			if (this.searchProblemQuery === query && this.lastSearchedQuery === query) return;
			
			this.searchProblemQuery = query;
			this.lastSearchedQuery = query;
			this.currentPage = 1;
			localStorage.setItem('trouble_docs_current_page', '1');
			this.getProblems(1);
		},

		updateScrollMarkers() {
			if (this.isMobile) return;
			this.$nextTick(() => {
				const container = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');
				if (!container || !this.paginatedProblems || this.paginatedProblems.length === 0) {
					this.scrollMarkers = [];
					return;
				}

				const scrollHeight = container.scrollHeight;
				if (scrollHeight <= 0) return;

				const markers = [];
				this.paginatedProblems.forEach(prob => {
					const el = document.getElementById('problem-card-' + prob.id);
					if (el) {
						const topPos = el.offsetTop;
						let percent = (topPos / scrollHeight) * 100;
						percent = Math.min(Math.max(percent, 3), 97);

						markers.push({
							id: prob.id,
							title: prob.title,
							solution: prob.solution,
							topPercent: percent.toFixed(2)
						});
					}
				});
				this.scrollMarkers = markers;
			});
		},

		canManageShare(item) {
			if (!item) return false;
			const curUser = this.currentUser;
			if (!curUser) return false;

			const creator = item.creator || {};
			const creatorId = item.creatorId || item.creator_id || creator.id;
			const creatorUsername = creator.username || item.creatorName || '';

			const curUserId = curUser.id || curUser.userId || curUser.uid;
			const curUsername = curUser.username || curUser.name || curUser.sign || '';

			if (curUserId !== undefined && curUserId !== null && creatorId !== undefined && creatorId !== null) {
				if (Number(curUserId) === Number(creatorId)) return true;
			}

			if (curUsername && creatorUsername) {
				if (String(curUsername).trim().toLowerCase() === String(creatorUsername).trim().toLowerCase()) return true;
			}

			return false;
		},

		handleScroll(e) {
			const scrollTop = e.target.scrollTop;
			this.showScrollButtons = scrollTop > 150;

			if (this.isMobile) return;

			const containerRect = e.target.getBoundingClientRect();
			let currentActiveId = null;
			for (const prob of this.paginatedProblems) {
				const el = document.getElementById('problem-card-' + prob.id);
				if (el) {
					const rect = el.getBoundingClientRect();
					if (rect.top <= containerRect.top + 180 && rect.bottom >= containerRect.top) {
						currentActiveId = prob.id;
					}
				}
			}
			this.activeMarkerId = currentActiveId;
		},

		scrollToTop() {
			const mainContainer = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');
			if (mainContainer) {
				mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
			}
		},

		scrollToBottom() {
			const mainContainer = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');
			if (mainContainer) {
				mainContainer.scrollTo({ top: mainContainer.scrollHeight, behavior: 'smooth' });
			}
		},

		async selectCategory(id) {
			if (id === null || id === undefined) {
				this.activeCategoryId = null;
				localStorage.removeItem('trouble_docs_active_cat_id');
				this.problems = [];
				return;
			}

			if (Number(this.activeCategoryId) === Number(id)) return;

			this.isContentVisible = false;
			await new Promise(resolve => setTimeout(resolve, 140));

			this.activeCategoryId = Number(id);
			localStorage.setItem('trouble_docs_active_cat_id', id);

			this.searchProblemInput = '';
			this.searchProblemQuery = '';
			this.lastSearchedQuery = '';
			this.currentPage = 1;
			localStorage.setItem('trouble_docs_current_page', '1');
			this.cardDealKey = Date.now();

			if (this.isMobile) {
				this.sidebarCollapsed = true;
			}

			await this.getProblems(1);

			this.$nextTick(() => {
				this.isContentVisible = true;
				this.updateScrollMarkers();
			});
		},

		async scrollToProblem(id) {
			const index = this.currentProblems.findIndex(p => p.id === id);
			if (index !== -1) {
				const targetEl = document.getElementById('problem-card-' + id);
				const mainContainer = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');

				if (mainContainer && targetEl) {
					const containerRect = mainContainer.getBoundingClientRect();
					const targetRect = targetEl.getBoundingClientRect();
					const targetScrollTop = mainContainer.scrollTop + (targetRect.top - containerRect.top) - 20;

					mainContainer.scrollTo({
						top: Math.max(0, targetScrollTop),
						behavior: 'smooth'
					});

					this.highlightedProblemId = id;
					this.activeMarkerId = id;
					if (this.highlightTimer) clearTimeout(this.highlightTimer);
					this.highlightTimer = setTimeout(() => {
						this.highlightedProblemId = null;
					}, 2200);
				}
			}
		},

		getPlainSummary(text) {
			if (!text) return '暂无详细描述...';
			let clean = text
				.replace(/```[\s\S]*?```/g, '[代码块]')
				.replace(/`[^`]+`/g, '$1')
				.replace(/!\[.*?\]\(.*?\)/g, '[图片]')
				.replace(/\[.*?\]\(.*?\)/g, '$1')
				.replace(/[#*>\-~]/g, '')
				.replace(/\s+/g, ' ')
				.trim();
			return clean.length > 45 ? clean.substring(0, 45) + '...' : (clean || '暂无详细描述...');
		},

		handleUserCommand(command) {
			MessageBox.confirm('确定要退出当前系统吗?', '退出确认', {
				confirmButtonText: '安全退出',
				cancelButtonText: '取消',
				type: 'warning',
				customClass: 'custom-logout-confirm'
			}).then(() => {
				localStorage.removeItem('sign');
				localStorage.removeItem('userInfo');
				localStorage.removeItem('user');
				Message.success('已退出系统');
				setTimeout(() => { window.location.reload(); }, 500);
			}).catch(() => {});
		},

		isMarkdown(text) {
			if (!text || typeof text !== 'string') return false;
			const mdPatterns = [
				/```[\s\S]*?```/, /`[^`]+`/, /!\[.*?\]\(.*?\)/, /\[.*?\]\(.*?\)/,
				/^#{1,6}\s+/m, /^\s*[-*+]\s+/m, /^\s*\d+\.\s+/m, /^\s*>\s+/m, /\*\*.+?\*\*/, /~~.+?~~/
			];
			return mdPatterns.some(pattern => pattern.test(text));
		},

		renderMarkdown(text) {
			if (!text) return '';
			try {
				return marked.parse(text);
			} catch (e) {
				console.error('marked parse error:', e);
				return text;
			}
		},

		async finishEditTitle(prob) {
			if (this.editTitleId !== prob.id) return;
			
			if (!this.canManageShare(prob)) {
				this.showToast('仅文档创建者支持修改标题');
				this.editTitleId = null;
				return;
			}

			this.editTitleId = null;
			this.apiLoading = true;
			try {
				const resp = await create_problems({
					id: prob.id,
					category_id: prob.categoryId,
					title: prob.title.trim(),
					solution: prob.solution,
					is_shared: prob.isShared
				});
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000) {
					prob.updatedAt = getNowDate();
					this.showToast('故障标题已同步更新');
					this.updateScrollMarkers();
				} else {
					this.showToast(res?.msg || '标题更新失败');
				}
			} catch (err) {
				console.error('update title error:', err);
				this.showToast('更新标题失败，网络异常');
			} finally {
				this.apiLoading = false;
			}
		},

		async finishEditSolution(prob) {
			if (this.editSolutionId !== prob.id) return;

			this.editSolutionId = null;
			this.apiLoading = true;
			try {
				const resp = await create_problems({
					id: prob.id,
					category_id: prob.categoryId,
					title: prob.title,
					solution: prob.solution.trim(),
					is_shared: prob.isShared
				});
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000) {
					prob.updatedAt = getNowDate();
					this.showToast('故障内容已同步更新');
					this.updateScrollMarkers();
				} else {
					this.showToast(res?.msg || '内容更新失败');
				}
			} catch (err) {
				console.error('update solution error:', err);
				this.showToast('更新内容失败，网络异常');
			} finally {
				this.apiLoading = false;
			}
		},

		async finishEditCategory(cat) {
			if (this.editCategoryId !== cat.id) return;

			if (!this.canManageShare(cat)) {
				this.showToast('仅分类创建者支持重命名分类');
				this.editCategoryId = null;
				return;
			}

			const targetId = cat.id;
			const newName = this.editCategoryName.trim() || '未命名分类';
			this.editCategoryId = null;
			cat.name = newName;

			this.apiLoading = true;
			try {
				const resp = await create_categories({ id: targetId, name: newName, is_shared: cat.is_shared });
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000) {
					this.showToast('目录名称已同步保存至后端');
				} else {
					this.showToast(res?.msg || '分类更新失败');
				}
			} catch (err) {
				console.error('update category error:', err);
				this.showToast('分类更新网络请求失败');
			} finally {
				this.apiLoading = false;
			}
		},

		handleCategoryCommand(command, cat) {
			this.safeClosePopover(cat.id);
			if (!this.canManageShare(cat)) {
				this.showToast('仅分类创建者可进行此操作');
				return;
			}
			if (command === 'rename') {
				this.editCategoryId = cat.id;
				this.editCategoryName = cat.name;
				this.$nextTick(() => {
					const inputRef = this.$refs['catInput_' + cat.id];
					if (inputRef && inputRef[0]) inputRef[0].focus();
				});
			}
		},

		async createCategories(name) {
			try {
				const resp = await create_categories({ name, is_shared: false });
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000 && res.data) {
					const newCat = {
						id: Number(res.data.id),
						name: res.data.name,
						is_shared: res.data.is_shared ?? false,
						sharedUsers: Array.isArray(res.data.shared_users) ? res.data.shared_users : [],
						creator: res.data.creator || this.currentUser,
						creatorId: res.data.creator_id || this.currentUser?.id,
						createdAt: res.data.created_at || getNowDate(),
						problems: []
					};
					this.categories.push(newCat);
					this.selectCategory(newCat.id);
					this.showToast('知识库目录创建成功');
					return newCat;
				} else {
					this.showToast(res?.msg || '创建分类失败');
				}
			} catch (err) {
				console.error('createCategories error:', err);
				this.showToast('创建分类网络请求异常');
			}
		},

		async getCategories(page = 1) {
			try {
				const resp = await get_categories({ page });
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.code === 200)) {
					const dataObj = res.data || {};
					const rawList = Array.isArray(dataObj.list) ? dataObj.list : (Array.isArray(dataObj) ? dataObj : []);
					
					this.totalCategories = typeof dataObj.total === 'number' ? dataObj.total : rawList.length;

					this.categories = rawList.map(cat => ({
						id: Number(cat.id),
						name: cat.name,
						is_shared: cat.is_shared ?? false,
						sharedUsers: Array.isArray(cat.shared_users) ? cat.shared_users : (Array.isArray(cat.sharedUsers) ? cat.sharedUsers : []),
						creatorId: cat.creator_id,
						updatedById: cat.updated_by_id,
						creator: cat.creator || null,
						updatedBy: cat.updated_by || null,
						createdAt: cat.created_at,
						updatedAt: cat.updated_at,
						problems: Array.isArray(cat.problems) ? cat.problems : []
					}));

					let tempProblems = [];
					rawList.forEach(cat => {
						if (cat.problems && Array.isArray(cat.problems)) {
							cat.problems.forEach(p => {
								tempProblems.push(this.formatProblem(p, cat.creator));
							});
						}
					});

					if (this.problems.length === 0 && tempProblems.length > 0) {
						this.problems = tempProblems;
					}
					return rawList;
				}
			} catch (err) {
				console.error('getCategories error:', err);
				this.showToast('获取分类目录失败');
			}
		},

		async getProblems(page = 1) {
			this.apiLoading = true;
			try {
				const params = {
					page: page,
					page_size: this.pageSize,
					keyword: this.searchProblemQuery.trim() || '',
				};

				if (this.activeCategoryId) {
					params.category_id = Number(this.activeCategoryId);
				}

				const resp = await get_problems(params);
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.code === 200)) {
					const dataObj = res.data || {};
						
					if (typeof dataObj.total === 'number') {
						this.totalProblems = dataObj.total;
					} else if (typeof res.total === 'number') {
						this.totalProblems = res.total;
					}

					const list = Array.isArray(dataObj.list) ? dataObj.list : (Array.isArray(dataObj) ? dataObj : []);
					this.problems = list.map(p => this.formatProblem(p));
					this.updateScrollMarkers();
					return list;
				}
			} catch (err) {
				console.error('getProblems error:', err);
				this.showToast('获取故障记录失败');
			} finally {
				this.apiLoading = false;
			}
		},

		async createProblems(payload) {
			try {
				const resp = await create_problems({
					category_id: Number(payload.categoryId),
					title: payload.title,
					solution: payload.solution,
					is_shared: true
				});
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000 && res.data) {
					const newProb = this.formatProblem(res.data);
					this.problems.unshift(newProb);

					const cat = this.categories.find(c => Number(c.id) === Number(payload.categoryId));
					if (cat) {
						if (!Array.isArray(cat.problems)) cat.problems = [];
						cat.problems.unshift(res.data);
					}

					this.currentPage = 1;
					localStorage.setItem('trouble_docs_current_page', '1');
					this.cardDealKey = Date.now();
					this.showToast('新故障记录发布成功');
					this.updateScrollMarkers();
					return newProb;
				} else {
					this.showToast(res?.msg || '新建故障记录失败');
				}
			} catch (err) {
				console.error('createProblems error:', err);
				this.showToast('创建故障记录网络请求异常');
			}
		},

		formatProblem(p, catCreator = null) {
			const rawDate = p.updated_at || p.date || p.created_at;
			let displayTime = getNowDate();
			if (rawDate) {
				displayTime = rawDate.replace('T', ' ').substring(0, 16);
			}

			let creatorObj = p.creator || null;
			if (!creatorObj && catCreator && (p.creator_id === catCreator.id || !p.creator_id)) {
				creatorObj = catCreator;
			}

			let updatedByObj = p.updated_by || null;
			if (!updatedByObj) {
				updatedByObj = creatorObj;
			}

			let editorsList = Array.isArray(p.editors) && p.editors.length > 0 ? p.editors : [];
			if (editorsList.length === 0 && creatorObj) {
				editorsList = [creatorObj];
				if (updatedByObj && updatedByObj.id !== creatorObj.id) {
					editorsList.push(updatedByObj);
				}
			}

			let attachmentsList = [];
			if (Array.isArray(p.file_url) && p.file_url.length > 0) {
				attachmentsList = p.file_url.map(f => ({
					id: f.id || f.file_id,
					name: f.name || '附件文件',
					url: f.url,
					uploader: f.uploader || null
				}));
			} else if (p.attachment) {
				attachmentsList = [{
					id: p.attachment.id || p.attachment.file_id,
					name: p.attachment.name || '附件文件',
					url: p.attachment.url,
					uploader: p.attachment.uploader || null
				}];
			}

			const catId = p.category_id || p.categoryId || (p.category ? p.category.id : null);
			const catName = p.category ? p.category.name : '';

			return {
				id: p.id,
				categoryId: catId !== null && catId !== undefined ? Number(catId) : null,
				categoryName: catName,
				title: p.title || '',
				solution: p.solution || '',
				isShared: p.is_shared ?? true,
				sharedUsers: Array.isArray(p.shared_users) ? p.shared_users : (Array.isArray(p.sharedUsers) ? p.sharedUsers : []),
				version: p.version || 1,
				updatedAt: displayTime,
				creator: creatorObj,
				updatedBy: updatedByObj,
				editors: editorsList,
				attachments: attachmentsList
			};
		},

		async fetchData() {
			this.pageLoading = true;
			try {
				await this.getCategories(1);
				const savedCatId = localStorage.getItem('trouble_docs_active_cat_id');
				const savedPage = Number(localStorage.getItem('trouble_docs_current_page')) || 1;

				let targetCatId = null;
				if (savedCatId !== null && savedCatId !== undefined && savedCatId !== '') {
					if (this.filteredCategories.some(c => Number(c.id) === Number(savedCatId))) {
						targetCatId = Number(savedCatId);
					}
				}

				if (targetCatId === null) {
					if (this.filteredCategories.length > 0) {
						targetCatId = this.filteredCategories[0].id;
					} else if (this.categories.length > 0) {
						targetCatId = this.categories[0].id;
					}
				}

				this.activeCategoryId = targetCatId;

				if (targetCatId !== null) {
					localStorage.setItem('trouble_docs_active_cat_id', targetCatId);
					this.currentPage = savedPage;
					await this.getProblems(savedPage);
				} else {
					localStorage.removeItem('trouble_docs_active_cat_id');
				}
			} catch (err) {
				console.error('fetchData error:', err);
			} finally {
				this.pageLoading = false;
			}
		},

		async handleSizeChange(val) {
			this.pageSize = val;
			this.currentPage = 1;
			localStorage.setItem('trouble_docs_current_page', '1');
			await this.getProblems(1);
		},

		async handleCurrentChange(val) {
			this.currentPage = val;
			localStorage.setItem('trouble_docs_current_page', String(val));
			await this.getProblems(val);
		},

		triggerUpload(probId) {
			this.uploadTargetProbId = probId;
			this.$refs.hiddenFileInput.click();
		},

		async handleFileUpload(event) {
			const file = event.target.files[0];
			if (!file || !this.uploadTargetProbId) return;

			const prob = this.problems.find(p => p.id === this.uploadTargetProbId);
			const isExistSameName = prob && prob.attachments && prob.attachments.some(a => a.name === file.name);

			if (prob && prob.attachments && prob.attachments.length >= 10 && !isExistSameName) {
				this.showToast('单个文档最多只能上传 10 个附件');
				event.target.value = '';
				this.uploadTargetProbId = null;
				return;
			}

			const formData = new FormData();
			formData.append('file', file, file.name);
			formData.append('problem_id', this.uploadTargetProbId);
			formData.append('name', file.name);
			formData.append('override', 'true');

			this.apiLoading = true;
			try {
				const resp = await upload_doc(formData);
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.url)) {
					const fileData = (res.data && res.data.url) ? res.data : res;

					if (prob) {
						if (!prob.attachments) {
							this.$set(prob, 'attachments', []);
						}

						const newAttachment = {
							id: fileData.id || fileData.file_id,
							name: fileData.name || file.name,
							url: fileData.url,
							uploader: fileData.uploader || null
						};

						const uploadName = fileData.name || file.name;
						const existIdx = prob.attachments.findIndex(a => a.name === uploadName);

						if (existIdx !== -1) {
							prob.attachments.splice(existIdx, 1, newAttachment);
							this.showToast(`附件【${uploadName}】同名覆盖更新成功！`);
						} else {
							prob.attachments.push(newAttachment);
							this.showToast(`附件【${uploadName}】上传成功！`);
						}
					}
				} else {
					this.showToast(res?.msg || '附件上传失败');
				}
			} catch (e) {
				console.error('upload_doc error:', e);
				this.showToast('附件上传失败，网络或服务器异常');
			} finally {
				this.apiLoading = false;
				event.target.value = '';
				this.uploadTargetProbId = null;
			}
		},

		async removeAttachment(prob, attachment, index) {
			if (!prob || !attachment) return;
			if (!this.canManageShare(prob)) {
				this.showToast('仅文档创建者可移除附件');
				return;
			}
			this.apiLoading = true;
			try {
				const fileId = attachment.id || attachment.file_id;
				const resp = await del_doc({ id: prob.id, file_id: fileId });
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && res.code === 1000) {
					if (typeof index === 'number' && prob.attachments) {
						prob.attachments.splice(index, 1);
					} else if (prob.attachments) {
						const targetIdx = prob.attachments.findIndex(item => (item.id || item.file_id) === fileId);
						if (targetIdx !== -1) prob.attachments.splice(targetIdx, 1);
					}
					this.showToast('附件已成功移除');
				} else {
					this.showToast(res?.msg || '移除附件失败');
				}
			} catch (e) {
				console.error('del_doc error:', e);
				this.showToast('移除附件失败，网络异常');
			} finally {
				this.apiLoading = false;
			}
		},

		getCategoryName(id) {
			const cat = this.categories.find(c => Number(c.id) === Number(id));
			return cat ? cat.name : '未知目录';
		},

		toggleBatchMode() {
			if (this.$refs.exportPopover) {
				this.$refs.exportPopover.doClose();
			}
			this.isBatchMode = !this.isBatchMode;
			if (!this.isBatchMode) {
				this.selectedProblemIds = [];
			}
		},

		toggleSingleSelection(id) {
			if (!this.isBatchMode) return;
			const idx = this.selectedProblemIds.indexOf(id);
			if (idx === -1) {
				this.selectedProblemIds.push(id);
			} else {
				this.selectedProblemIds.splice(idx, 1);
			}
		},

		openMoveDialog(prob) {
			if (!this.canManageShare(prob)) {
				this.showToast('仅文档创建者支持移动分类');
				return;
			}
			this.moveTargetProblem = prob;
			this.moveToCategoryId = prob.categoryId;
			this.moveDialogVisible = true;
		},

		async confirmMoveProblem() {
			if (!this.moveToCategoryId || !this.moveTargetProblem) {
				this.showToast('请选择迁移的目标目录');
				return;
			}
			if (!this.canManageShare(this.moveTargetProblem)) {
				this.showToast('仅文档创建者支持移动分类');
				return;
			}
			this.apiLoading = true;
			try {
				const targetId = this.moveTargetProblem.id;
				const oldCatId = this.moveTargetProblem.categoryId;
				const newCatId = Number(this.moveToCategoryId);

				const resp = await update_problems_categories({ pid: targetId, cid: newCatId });
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && res.code === 1000) {
					const probIndex = this.problems.findIndex(p => p.id === targetId);
					if (probIndex !== -1) {
						this.problems[probIndex].categoryId = newCatId;
					}

					const oldCat = this.categories.find(c => Number(c.id) === Number(oldCatId));
					if (oldCat && Array.isArray(oldCat.problems)) {
						oldCat.problems = oldCat.problems.filter(p => p.id !== targetId);
					}
					const newCat = this.categories.find(c => Number(c.id) === Number(newCatId));
					if (newCat) {
						if (!Array.isArray(newCat.problems)) newCat.problems = [];
						newCat.problems.push(this.moveTargetProblem);
					}

					this.selectedProblemIds = this.selectedProblemIds.filter(id => id !== targetId);

					this.moveDialogVisible = false;
					this.showToast('文档已成功转移到指定新目录');
					this.updateScrollMarkers();
				} else {
					this.showToast(res?.msg || '转移目录失败');
				}
			} catch (e) {
				console.error('update_problems_categories error:', e);
				this.showToast('系统移动失败，网络异常');
			} finally {
				this.apiLoading = false;
			}
		},

		convertMarkdownToPlainText(text) {
			if (!text) return '';
			let clean = text
				.replace(/```[a-zA-Z]*\n?([\s\S]*?)\n?```/g, '$1')
				.replace(/`([^`]+)`/g, '$1')
				.replace(/!\[(.*?)\]\(.*?\)/g, '$1')
				.replace(/\[(.*?)\]\(.*?\)/g, '$1')
				.replace(/^#{1,6}\s+(.*)$/gm, '\n$1\n')
				.replace(/^\s*>\s?/gm, '')
				.replace(/(\*\*|__)(.*?)\1/g, '$2')
				.replace(/(\*|_)(.*?)\1/g, '$2')
				.replace(/~~(.*?)~~/g, '$1')
				.replace(/^\s*[-*+]\s+/gm, '• ')
				.replace(/\n(?=\s*\d+\.\s+)/g, '\n\n')
				.replace(/\n(?=\s*•\s+)/g, '\n\n')
				.replace(/^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/gm, '')
				.replace(/^\||\|$/gm, '')
				.replace(/^\s*[-*_]{3,}\s*$/gm, '\n----------------------------------------\n')
				.replace(/[ \t]+$/gm, '')
				.replace(/\n{3,}/g, '\n\n')
				.trim();
			return clean;
		},

		handleCopyCommand(command, solutionText) {
			if (!solutionText) return;
			if (command === 'raw') {
				this.copySolution(solutionText, '原文内容已成功复制到剪贴板');
			} else if (command === 'plain') {
				const plainText = this.convertMarkdownToPlainText(solutionText);
				this.copySolution(plainText, '纯文本无格式内容已成功复制到剪贴板');
			}
		},

		copySolution(text, customToastMsg = '内容已成功复制到剪贴板') {
			if (!text) return;
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(() => {
					this.showToast(customToastMsg);
				}).catch(() => { this.fallbackCopy(text, customToastMsg); });
			} else {
				this.fallbackCopy(text, customToastMsg);
			}
		},
		fallbackCopy(text, customToastMsg = '内容已成功复制到剪贴板') {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed";
			document.body.appendChild(textArea);
			textArea.focus(); textArea.select();
			try {
				document.execCommand('copy');
				this.showToast(customToastMsg);
			} catch (err) {
				this.showToast('复制失败，请手动框选复制。');
			}
			document.body.removeChild(textArea);
		},

		showToast(msg) {
			this.toastMsg = msg;
			this.toastVisible = true;
			if (this.toastTimer) clearTimeout(this.toastTimer);
			this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
		},

		toggleTheme() { this.isDark = !this.isDark; },

		requestDeleteCategory(cat) {
			this.safeClosePopover(cat.id);
			if (!this.canManageShare(cat)) {
				this.showToast('仅分类创建者支持删除该分类');
				return;
			}
			this.deleteTarget = { type: 'category', id: cat.id };
			this.deleteMessage = `确定删除【${cat.name}】目录及其关联的所有排错记录吗？`;
			this.deleteDialogVisible = true;
		},

		requestDeleteProblem(id) {
			const prob = this.problems.find(p => p.id === id);
			if (prob && !this.canManageShare(prob)) {
				this.showToast('仅文档创建者支持删除该故障记录');
				return;
			}
			this.deleteTarget = { type: 'problem', id: id };
			this.deleteMessage = `确定要永久删除这条故障记录吗？`;
			this.deleteDialogVisible = true;
		},

		async commitPendingDelete() {
			if (!this.undoData) return;

			if (this.undoTimer) {
				clearInterval(this.undoTimer);
				this.undoTimer = null;
			}

			const pending = this.undoData;
			this.undoData = null;

			try {
				if (pending.type === 'category') {
					const resp = await del_categories({ id: Number(pending.id) });
					const res = resp?.data?.code !== undefined ? resp.data : resp;
					if (!(res && (res.code === 1000 || res.code === 200))) {
						this.showToast(res?.msg || '后台真正删除分类失败');
					}
				} else if (pending.type === 'problem') {
					const resp = await del_problems({ id: Number(pending.id) });
					const res = resp?.data?.code !== undefined ? resp.data : resp;
					if (!(res && (res.code === 1000 || res.code === 200))) {
						this.showToast(res?.msg || '后台真正删除文档失败');
					}
				}
			} catch (err) {
				console.error('commitPendingDelete error:', err);
				this.showToast('后台真正提交删除时发生网络异常');
			}
		},

		async confirmDelete() {
			if (!this.deleteTarget) return;

			if (this.undoData) {
				await this.commitPendingDelete();
			}

			const targetType = this.deleteTarget.type;
			const targetId = this.deleteTarget.id;

			if (targetType === 'category') {
				const cat = this.categories.find(c => Number(c.id) === Number(targetId));
				if (cat && !this.canManageShare(cat)) {
					this.showToast('仅分类创建者支持删除该分类');
					this.deleteDialogVisible = false;
					this.deleteTarget = null;
					return;
				}
			} else if (targetType === 'problem') {
				const prob = this.problems.find(p => p.id === targetId);
				if (prob && !this.canManageShare(prob)) {
					this.showToast('仅文档创建者支持删除该记录');
					this.deleteDialogVisible = false;
					this.deleteTarget = null;
					return;
				}
			}

			let backupData = null;

			if (targetType === 'category') {
				const index = this.categories.findIndex(c => Number(c.id) === Number(targetId));
				if (index !== -1) {
					const targetCat = this.categories[index];
					const relatedProbs = this.problems.filter(p => Number(p.categoryId) === Number(targetId));

					backupData = {
						type: 'category',
						id: targetId,
						catIndex: index,
						category: { ...targetCat },
						problems: relatedProbs
					};

					this.categories.splice(index, 1);
					this.problems = this.problems.filter(p => Number(p.categoryId) !== Number(targetId));

					if (Number(this.activeCategoryId) === Number(targetId)) {
						if (this.filteredCategories.length > 0) {
							const fallbackCatId = this.filteredCategories[0].id;
							this.activeCategoryId = fallbackCatId;
							localStorage.setItem('trouble_docs_active_cat_id', fallbackCatId);
							this.currentPage = 1;
							localStorage.setItem('trouble_docs_current_page', '1');
							this.getProblems(1);
						} else {
							this.activeCategoryId = null;
							localStorage.removeItem('trouble_docs_active_cat_id');
						}
					}
				}
			} else if (targetType === 'problem') {
				const index = this.problems.findIndex(p => p.id === targetId);
				if (index !== -1) {
					const deletedProb = this.problems[index];

					backupData = {
						type: 'problem',
						id: targetId,
						probIndex: index,
						problem: { ...deletedProb }
					};

					this.problems.splice(index, 1);

					const cat = this.categories.find(c => Number(c.id) === Number(deletedProb.categoryId));
					if (cat && Array.isArray(cat.problems)) {
						cat.problems = cat.problems.filter(p => p.id !== targetId);
					}

					this.selectedProblemIds = this.selectedProblemIds.filter(sid => sid !== targetId);
				}
			}

			this.deleteDialogVisible = false;
			this.deleteTarget = null;

			if (backupData) {
				this.triggerUndoToast(backupData);
			}
			this.updateScrollMarkers();
		},

		triggerUndoToast(backupData) {
			if (this.undoTimer) clearInterval(this.undoTimer);
			this.undoData = backupData;
			this.undoCountdown = 20;

			this.undoTimer = setInterval(async () => {
				this.undoCountdown--;
				if (this.undoCountdown <= 0) {
					clearInterval(this.undoTimer);
					this.undoTimer = null;
					await this.commitPendingDelete();
				}
			}, 1000);
		},

		async executeUndo() {
			if (!this.undoData) return;

			if (this.undoTimer) {
				clearInterval(this.undoTimer);
				this.undoTimer = null;
			}

			const backupData = this.undoData;
			this.undoData = null;

			if (backupData.type === 'category') {
				if (backupData.catIndex !== undefined && backupData.catIndex <= this.categories.length) {
					this.categories.splice(backupData.catIndex, 0, backupData.category);
				} else {
					this.categories.push(backupData.category);
				}

				if (backupData.problems && backupData.problems.length > 0) {
					this.problems.push(...backupData.problems);
				}
				this.activeCategoryId = backupData.category.id;
				localStorage.setItem('trouble_docs_active_cat_id', backupData.category.id);
				this.getProblems(this.currentPage);
				this.showToast(`已成功撤回并恢复【${backupData.category.name}】分类`);
			}
			else if (backupData.type === 'problem') {
				if (backupData.probIndex !== undefined && backupData.probIndex <= this.problems.length) {
					this.problems.splice(backupData.probIndex, 0, backupData.problem);
				} else {
					this.problems.unshift(backupData.problem);
				}

				const cat = this.categories.find(c => Number(c.id) === Number(backupData.problem.categoryId));
				if (cat && Array.isArray(cat.problems)) {
					cat.problems.unshift(backupData.problem);
				}
				this.activeCategoryId = backupData.problem.categoryId;
				localStorage.setItem('trouble_docs_active_cat_id', backupData.problem.categoryId);
				this.showToast('已成功撤回并恢复故障文档');
			}

			this.updateScrollMarkers();
		},

		safeClosePopover(id) {
			const popover = this.$refs['popover_' + id];
			if (popover) {
				if (Array.isArray(popover)) { if (popover[0]) popover[0].doClose(); }
				else { popover.doClose(); }
			}
		},

		startEditTitle(id) {
			const prob = this.problems.find(p => p.id === id);
			if (prob && !this.canManageShare(prob)) {
				this.showToast('仅文档创建者支持编辑标题');
				return;
			}
			this.editTitleId = id;
			this.$nextTick(() => {
				const ref = this.$refs['titleInput_' + id];
				if (ref && ref[0]) ref[0].focus();
			});
		},

		startEditSolution(id) {
			this.editSolutionId = id;
			this.$nextTick(() => {
				const ref = this.$refs['solutionInput_' + id];
				if (ref && ref[0]) ref[0].focus();
			});
		},

		openCategoryDialog() {
			this.categoryForm.name = '';
			this.categoryVisible = true;
			this.$nextTick(() => { this.$refs.categoryForm && this.$refs.categoryForm.clearValidate(); });
		},
		async submitCategory() {
			this.$refs.categoryForm.validate(async valid => {
				if (valid) {
					this.apiLoading = true;
					try {
						await this.createCategories(this.categoryForm.name.trim());
						this.categoryVisible = false;
					} finally {
						this.apiLoading = false;
					}
				}
			});
		},

		openProblemDialog() {
			if (!this.canAddProblemInCurrentCategory) {
				this.showToast('他人共享给您的分类目录暂不支持录入新故障文档');
				return;
			}
			this.problemForm = { title: '', solution: '' };
			this.problemVisible = true;
			this.$nextTick(() => { this.$refs.problemForm && this.$refs.problemForm.clearValidate(); });
		},

		async submitProblem() {
			if (!this.canAddProblemInCurrentCategory) {
				this.showToast('他人共享给您的分类目录暂不支持录入新故障文档');
				return;
			}
			this.$refs.problemForm.validate(async valid => {
				if (valid) {
					this.apiLoading = true;
					try {
						await this.createProblems({
							categoryId: this.activeCategoryId,
							title: this.problemForm.title.trim(),
							solution: this.problemForm.solution.trim()
						});
						this.problemVisible = false;
					} finally {
						this.apiLoading = false;
					}
				}
			});
		}
	}
}
</script>

<style scoped>
/* ================= 划选文字 AI 提问 浮动微按钮 ================= */
.ai-selection-tooltip {
	position: absolute;
	z-index: 99999;
	background: linear-gradient(135deg, #0ea5e9, #6366f1);
	color: #ffffff;
	padding: 6px 14px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	box-shadow: 0 4px 16px rgba(14, 165, 233, 0.45);
	display: flex;
	align-items: center;
	gap: 6px;
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	user-select: none;
}

.ai-selection-tooltip:hover {
	transform: scale(1.08) translateY(-2px);
	box-shadow: 0 6px 20px rgba(14, 165, 233, 0.65);
}

/* ================= 页面右侧 AI 悬浮球 (FAB) ================= */
.ai-floating-fab {
	position: fixed;
	right: 36px;
	bottom: 140px; /* 提升高度，避开底部置顶悬浮栏 */
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: linear-gradient(135deg, #0ea5e9, #6366f1);
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	z-index: 95;
	box-shadow: 0 6px 20px rgba(14, 165, 233, 0.45);
	transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
	user-select: none;
}

.ai-floating-fab:hover {
	transform: scale(1.12) translateY(-3px);
	box-shadow: 0 10px 28px rgba(14, 165, 233, 0.65);
}

.fab-glow-ring {
	position: absolute;
	top: -2px; left: -2px; right: -2px; bottom: -2px;
	border-radius: 50%;
	border: 2px solid rgba(56, 189, 248, 0.6);
	animation: fabPulse 2s infinite;
}

@keyframes fabPulse {
	0% { transform: scale(1); opacity: 0.8; }
	100% { transform: scale(1.35); opacity: 0; }
}

.fab-icon {
	font-size: 22px;
}

.fab-history-badge {
	position: absolute;
	top: -4px;
	right: -6px;
	background-color: #f59e0b;
	color: #000;
	font-size: 10px;
	font-weight: 800;
	padding: 1px 5px;
	border-radius: 10px;
	border: 2px solid var(--bg-card);
	font-family: monospace;
}

/* ================= AI 弹窗 UI 样式 ================= */
.ai-dialog-custom-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-right: 28px;
	flex-wrap: wrap;
	gap: 10px;
}

.header-title-left {
	display: flex;
	align-items: center;
	gap: 10px;
}

.ai-glow-icon {
	width: 32px;
	height: 32px;
	border-radius: 10px;
	background: linear-gradient(135deg, #0ea5e9, #6366f1);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	box-shadow: 0 0 14px rgba(14, 165, 233, 0.5);
}

.title-text {
	font-size: 16px;
	font-weight: 700;
	color: var(--text-h1);
}

.ai-model-tag {
	font-size: 11px;
	font-weight: 600;
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 10px;
	font-family: monospace;
	border: 1px solid rgba(14, 165, 233, 0.2);
}

.header-actions-right {
	display: flex;
	align-items: center;
	gap: 12px;
}

/* 仿截图 Models/Agents 高颜值胶囊 Pill 切页滑块 */
.ai-pill-switch {
	display: inline-flex;
	align-items: center;
	background-color: var(--hover-sidebar);
	border: 1px solid var(--border-color);
	padding: 3px;
	border-radius: 20px;
	gap: 2px;
	user-select: none;
}

.pill-item {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-muted);
	padding: 5px 14px;
	border-radius: 16px;
	cursor: pointer;
	transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	display: flex;
	align-items: center;
	gap: 6px;
}

.pill-item:hover {
	color: var(--text-p);
}

.pill-item.active {
	background-color: var(--bg-card);
	color: var(--primary-blue);
	box-shadow: var(--shadow-sm);
}

.bp-wrapper.is-dark .pill-item.active {
	background-color: #27272a;
	color: #f8fafc;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.ai-config-toggle-btn {
	color: var(--primary-blue) !important;
	font-size: 16px !important;
	padding: 0 !important;
}

.ai-settings-panel {
	background-color: var(--hover-sidebar);
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 16px;
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.settings-title {
	font-size: 13px;
	font-weight: 700;
	color: var(--primary-blue);
	margin-bottom: 12px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.settings-tip {
	font-size: 11px;
	font-weight: normal;
	color: var(--text-muted);
}

.ai-chat-view-container {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.ai-selected-preview {
	background-color: var(--bg-app);
	border: 1px dashed var(--primary-blue);
	border-radius: 10px;
	padding: 10px 14px;
}

.preview-label {
	font-size: 12px;
	font-weight: 700;
	color: var(--primary-blue);
	margin-bottom: 4px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.preview-text {
	font-size: 12px;
	color: var(--text-p);
	line-height: 1.5;
	max-height: 80px;
	overflow-y: auto;
	word-break: break-all;
	font-family: monospace;
}

.ai-response-card {
	border: 1px solid var(--border-color);
	border-radius: 12px;
	background-color: var(--bg-card);
	overflow: hidden;
	box-shadow: var(--shadow-sm);
	transition: border-color 0.3s;
}

.ai-response-card.is-streaming {
	border-color: var(--primary-blue);
	box-shadow: 0 0 16px rgba(14, 165, 233, 0.2);
}

.response-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 14px;
	background-color: var(--hover-sidebar);
	border-bottom: 1px solid var(--border-color);
}

.header-status {
	display: flex;
	align-items: center;
	gap: 8px;
}

.status-indicator {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background-color: #10b981;
}

.status-indicator.pulse-active {
	background-color: #0ea5e9;
	animation: pulseGlow 1.2s infinite;
}

@keyframes pulseGlow {
	0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }
	70% { box-shadow: 0 0 0 8px rgba(14, 165, 233, 0); }
	100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
}

.status-text {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-h1);
}

/* AI 复制回答下拉按钮样式（与代码块复制按钮一致） */
.ai-code-copy-btn {
	appearance: none !important;
	-webkit-appearance: none !important;
	-moz-appearance: none !important;
	background: rgba(255, 255, 255, 0.08) !important;
	border: 1px solid rgba(255, 255, 255, 0.15) !important;
	color: #cbd5e1 !important;
	border-radius: 6px !important;
	padding: 4px 10px !important;
	font-size: 11px !important;
	line-height: 1.2 !important;
	cursor: pointer !important;
	outline: none !important;
	display: inline-flex !important;
	align-items: center !important;
	gap: 5px !important;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
	box-shadow: none !important;
	font-family: inherit !important;
	margin: 0 !important;
	vertical-align: middle !important;
}

.ai-code-copy-btn:hover {
	background: rgba(14, 165, 233, 0.25) !important;
	color: #38bdf8 !important;
	border-color: rgba(56, 189, 248, 0.5) !important;
	transform: translateY(-1px) !important;
}

.response-card-body {
	min-height: 180px;
	max-height: 320px;
	overflow-y: auto;
	padding: 16px 20px;
	position: relative;
}

.streaming-cursor {
	display: inline-block;
	color: var(--primary-blue);
	font-weight: bold;
	margin-left: 4px;
	animation: blinkCursor 0.8s infinite;
}

@keyframes blinkCursor {
	0%, 100% { opacity: 1; }
	50% { opacity: 0; }
}

/* 输入框组合区 & 底部一排单行工具栏 */
.ai-input-composer {
	background-color: var(--hover-sidebar);
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 10px 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.composer-textarea ::v-deep .el-textarea__inner {
	background-color: var(--bg-card) !important;
}

.composer-single-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 4px;
}

.bar-left-tools {
	display: flex;
	align-items: center;
	gap: 8px;
}

.tool-divider {
	width: 1px;
	height: 16px;
	background-color: var(--border-color);
	margin: 0 2px;
}

.icon-tool-btn {
	padding: 6px 10px !important;
	font-size: 14px !important;
	background-color: var(--bg-card) !important;
	border-color: var(--border-color) !important;
	color: var(--text-p) !important;
}

.icon-tool-btn.has-file {
	border-color: var(--primary-blue) !important;
	color: var(--primary-blue) !important;
	background-color: var(--active-sidebar) !important;
}

.preset-icon-group {
	display: flex;
	align-items: center;
	gap: 6px;
}

.preset-icon-chip {
	cursor: pointer;
	padding: 2px 6px;
	border-radius: 6px;
	font-size: 13px;
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	transition: all 0.2s;
	user-select: none;
}

.preset-icon-chip:hover {
	transform: scale(1.15);
	border-color: var(--primary-blue);
	background-color: var(--active-sidebar);
}

.clear-input-btn {
	color: var(--text-muted) !important;
	padding: 0 4px !important;
	font-size: 14px !important;
}

.clear-input-btn:hover {
	color: #ef4444 !important;
}

.bar-right-actions {
	display: flex;
	align-items: center;
}

.stop-btn {
	background: linear-gradient(135deg, #ef4444, #dc2626) !important;
	border: none !important;
	color: white !important;
	font-weight: 500;
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
	transition: all 0.3s ease;
}

.stop-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.image-preview-badge {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	background-color: var(--bg-card);
	border: 1px solid var(--primary-blue);
	padding: 4px 10px;
	border-radius: 8px;
	width: fit-content;
}

.thumb-img {
	width: 28px;
	height: 28px;
	border-radius: 4px;
	object-fit: cover;
}

.thumb-name {
	font-size: 12px;
	color: var(--text-p);
	max-width: 160px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.remove-img-btn {
	cursor: pointer;
	color: #ef4444;
	font-size: 14px;
}

/* AI 历史记录视图 */
.ai-history-view-container {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.history-list-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 4px;
}

.history-count-title {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-h1);
	display: flex;
	align-items: center;
	gap: 6px;
}

.danger-text-btn {
	color: #ef4444 !important;
	padding: 0 !important;
	font-size: 12px !important;
}

.history-card-list {
	max-height: 420px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-right: 4px;
}

.history-empty-hint {
	text-align: center;
	padding: 60px 0;
	color: var(--text-muted);
	font-size: 13px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.history-empty-hint i {
	font-size: 32px;
	color: var(--border-color);
}

.history-item-card {
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: 10px;
	padding: 12px 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	transition: border-color 0.2s, box-shadow 0.2s;
}

.history-item-card:hover {
	border-color: var(--primary-blue);
	box-shadow: var(--shadow-sm);
}

.history-item-card.is-active-history {
	border-color: var(--primary-blue);
	background-color: var(--active-sidebar);
}

.history-item-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.history-title-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.history-index-tag {
	font-size: 11px;
	font-weight: 800;
	background-color: var(--hover-sidebar);
	color: var(--primary-blue);
	padding: 1px 6px;
	border-radius: 4px;
	font-family: monospace;
}

.history-time {
	font-size: 11px;
	color: var(--text-muted);
}

.history-actions-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.history-query-snippet {
	font-size: 13px;
	color: var(--text-h1);
	line-height: 1.4;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.history-image-tag {
	font-size: 11px;
	color: var(--primary-blue);
	background-color: var(--hover-sidebar);
	padding: 1px 5px;
	border-radius: 4px;
	margin-left: 6px;
}

.history-response-snippet {
	font-size: 12px;
	color: var(--text-muted);
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.ai-placeholder-text {
	text-align: center;
	padding: 40px 0;
	font-size: 13px;
	color: var(--text-muted);
}

.warning-text {
	color: #f59e0b;
	font-weight: 600;
}

.ai-dialog-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.streaming-tip {
	font-size: 12px;
	color: var(--primary-blue);
	font-weight: 600;
}

/* ================= 富文本编辑器特定样式 ================= */
.word-toolbar {
	display: flex;
	align-items: center;
	padding: 8px 12px;
	background-color: var(--hover-sidebar);
	border: 1px solid var(--border-color);
	border-bottom: none;
	border-radius: 8px 8px 0 0;
	flex-wrap: wrap;
	gap: 8px;
}

.word-editable-box {
	min-height: 320px;
	max-height: 480px;
	overflow-y: auto;
	padding: 16px 20px;
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: 0 0 8px 8px;
	outline: none;
	color: var(--text-p);
	line-height: 1.6;
}

.word-editable-box:focus {
	border-color: var(--primary-blue);
	box-shadow: 0 0 0 1px var(--primary-blue);
}

/* ================= 主框架与主题变量 ================= */
.bp-wrapper {
	--bg-app: #f8fafc;
	--bg-sidebar: #ffffff;
	--bg-header: rgba(255, 255, 255, 0.85);
	--bg-card: #ffffff;
	--text-h1: #0f172a;
	--text-p: #334155;
	--text-muted: #64748b;
	--border-color: #e2e8f0;
	--hover-sidebar: #f1f5f9;
	--active-sidebar: #e0f2fe;
	--primary-blue: #0ea5e9;
	--code-bg: #f8fafc;
	--code-text: #1e293b;
	--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	--shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);

	height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column !important;
	overflow: hidden;
	margin: 0;
	font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
	background-color: var(--bg-app);
	color: var(--text-p);
	transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bp-wrapper.is-dark {
	--bg-app: #09090b;
	--bg-sidebar: #18181b;
	--bg-header: rgba(24, 24, 27, 0.75);
	--bg-card: #18181b;
	--text-h1: #f8fafc;
	--text-p: #cbd5e1;
	--text-muted: #64748b;
	--border-color: #27272a;
	--hover-sidebar: #27272a;
	--active-sidebar: rgba(14, 165, 233, 0.15);
	--primary-blue: #38bdf8;
	--code-bg: #0f172a;
	--code-text: #e2e8f0;
	--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
	--shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
}

::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

::-webkit-scrollbar-track {
	background: transparent;
}

::-webkit-scrollbar-thumb {
	background: var(--border-color);
	border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
	background: var(--text-muted);
}

.svn-action-btn {
	background-color: rgba(14, 165, 233, 0.08);
	color: var(--primary-blue);
}

.svn-action-btn:hover {
	background-color: rgba(14, 165, 233, 0.18);
}

.dialog-top-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	margin-bottom: 12px;
	background-color: var(--hover-sidebar);
	border-radius: 8px;
	border: 1px solid var(--border-color);
}

.mode-tip {
	font-size: 13px;
	color: var(--primary-blue);
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 6px;
}

.file-preview-body {
	min-height: 320px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background-color: var(--bg-app);
	border-radius: 8px;
	padding: 12px;
	border: 1px solid var(--border-color);
}

.preview-excel-container {
	width: 100%;
}

.excel-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.toolbar-hint {
	font-size: 12px;
	color: var(--text-muted);
}

.excel-table-scroll {
	max-height: 480px;
	overflow: auto;
	border: 1px solid var(--border-color);
	border-radius: 6px;
}

.custom-editable-excel-table {
	width: 100%;
	border-collapse: collapse;
	background-color: var(--bg-card);
	font-size: 13px;
}

.custom-editable-excel-table td {
	border: 1px solid var(--border-color);
	padding: 4px 8px;
	min-width: 90px;
	text-align: left;
}

.row-num-col {
	width: 36px;
	background-color: var(--hover-sidebar);
	text-align: center !important;
	color: var(--text-muted);
	font-weight: bold;
}

.cell-inline-input {
	width: 100%;
	border: none;
	outline: none;
	background: transparent;
	color: var(--text-p);
	font-size: 13px;
	padding: 2px 0;
}

.cell-inline-input:focus {
	background-color: rgba(14, 165, 233, 0.1);
}

.action-col {
	width: 36px;
	text-align: center !important;
}

.delete-row-btn {
	color: #ef4444;
	cursor: pointer;
	font-size: 14px;
}

.preview-word-container {
	width: 100%;
}

.word-editor-wrapper {
	width: 100%;
}

.preview-img-container {
	max-height: 580px;
	display: flex;
	justify-content: center;
	align-items: center;
	overflow: auto;
	width: 100%;
}

.preview-img {
	max-width: 100%;
	max-height: 560px;
	border-radius: 8px;
	object-fit: contain;
	box-shadow: var(--shadow-card);
}

.preview-iframe-container {
	width: 100%;
	height: 520px;
	border-radius: 6px;
	overflow: hidden;
	background-color: #ffffff;
}

.preview-text-container {
	width: 100%;
	max-height: 520px;
	overflow-y: auto;
	padding: 12px 16px;
	background-color: var(--code-bg);
	border-radius: 6px;
}

.preview-plain-code {
	font-family: "JetBrains Mono", Consolas, monospace;
	font-size: 13px;
	color: var(--code-text);
	white-space: pre-wrap;
	word-break: break-all;
	margin: 0;
	line-height: 1.6;
}

.preview-fallback-container {
	text-align: center;
	padding: 40px 20px;
	color: var(--text-muted);
}

.preview-fallback-container .fallback-icon {
	font-size: 54px;
	color: var(--primary-blue);
	margin-bottom: 16px;
}

.preview-fallback-container h3 {
	margin: 0 0 8px 0;
	font-size: 16px;
	color: var(--text-h1);
}

.preview-fallback-container p {
	font-size: 13px;
	margin: 0;
}

.preview-dialog-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.footer-right {
	display: flex;
	gap: 10px;
}

.btn-tooltip-wrapper {
	display: inline-block;
}

.primary-gradient-btn.is-disabled,
.primary-gradient-btn.is-disabled:hover {
	background: var(--border-color) !important;
	color: var(--text-muted) !important;
	border: none !important;
	box-shadow: none !important;
	cursor: not-allowed !important;
	transform: none !important;
}

.editable-text-wrapper.is-readonly {
	cursor: default !important;
}

.editable-text-wrapper.is-readonly:hover {
	background-color: transparent !important;
	border-color: transparent !important;
}

.scrollbar-markers-track {
	position: absolute;
	right: 3px;
	top: 0;
	bottom: 0;
	width: 12px;
	z-index: 45;
	pointer-events: none;
}

.scroll-marker-item {
	position: absolute;
	right: 0;
	width: 16px;
	height: 16px;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	pointer-events: auto;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.marker-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background-color: var(--primary-blue);
	opacity: 0.65;
	box-shadow: 0 0 6px rgba(14, 165, 233, 0.4);
	transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scroll-marker-item:hover .marker-dot {
	opacity: 1;
	transform: scale(1.6);
	background-color: #38bdf8;
	box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
}

.scroll-marker-item.is-active .marker-dot {
	opacity: 1;
	background-color: #f59e0b;
	box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
	transform: scale(1.3);
}

.marker-popover-content {
	padding: 4px;
}

.marker-popover-title {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-h1);
	margin-bottom: 6px;
	display: flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.marker-popover-title i {
	color: var(--primary-blue);
}

.marker-popover-summary {
	margin: 0 0 8px 0;
	font-size: 12px;
	color: var(--text-muted);
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	word-break: break-all;
}

.marker-popover-tip {
	font-size: 11px;
	color: var(--primary-blue);
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 4px;
}

.bp-header {
	height: 64px;
	flex-shrink: 0;
	background-color: var(--bg-header);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border-bottom: 1px solid var(--border-color);
	display: flex;
	flex-direction: row !important;
	justify-content: space-between;
	align-items: center;
	padding: 0 24px;
	z-index: 50;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 20px;
	flex-shrink: 0;
}

.collapse-btn {
	font-size: 20px;
	color: var(--text-muted);
	cursor: pointer;
	transition: color 0.2s;
}

.collapse-btn:hover {
	color: var(--primary-blue);
}

.header-logo {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

.logo-icon-wrapper {
	background: linear-gradient(135deg, #0ea5e9, #6366f1);
	color: white;
	width: 32px;
	height: 32px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	box-shadow: 0 2px 10px rgba(14, 165, 233, 0.3);
}

.logo-text {
	font-size: 19px;
	font-weight: 700;
	color: var(--text-h1);
	letter-spacing: -0.5px;
}

.logo-highlight {
	color: var(--primary-blue);
}

.header-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 16px;
	flex-shrink: 0;
}

.primary-gradient-btn {
	background: linear-gradient(135deg, #0ea5e9, #3b82f6) !important;
	border: none !important;
	color: white !important;
	font-weight: 500;
	box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
	transition: all 0.3s ease;
}

.primary-gradient-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
}

.divider {
	width: 1px;
	height: 24px;
	background-color: var(--border-color);
	flex-shrink: 0;
}

.theme-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	color: var(--text-muted);
	cursor: pointer;
	background-color: var(--hover-sidebar);
	transition: all 0.2s;
	flex-shrink: 0;
}

.theme-btn:hover {
	color: var(--primary-blue);
	transform: rotate(15deg);
}

.avatar-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	flex-shrink: 0;
}

.avatar-wrapper .login_user {
	font-size: 13px;
    padding-left: 4px;
}

.user-avatar {
	border: 2px solid var(--border-color);
	transition: all 0.25s ease;
}

.avatar-wrapper:hover .user-avatar {
	border-color: var(--primary-blue);
	transform: scale(1.08);
	box-shadow: 0 0 10px rgba(14, 165, 233, 0.4);
}

.bp-body {
	flex: 1;
	display: flex;
	flex-direction: row !important;
	height: calc(100vh - 64px);
	overflow: hidden;
	position: relative;
}

.bp-sidebar {
	width: 280px;
	flex-shrink: 0;
	background-color: var(--bg-sidebar);
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column !important;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bp-sidebar.is-collapsed {
	width: 0;
	opacity: 0;
	border-right: none;
	overflow: hidden;
}

.sidebar-top-action {
	padding: 20px 16px 12px 16px;
}

.add-cat-btn {
	width: 100%;
	border-radius: 8px !important;
	border-color: var(--border-color) !important;
	color: var(--text-p) !important;
	background: transparent !important;
	font-weight: 500;
	box-shadow: var(--shadow-sm);
}

.add-cat-btn:hover {
	border-color: var(--primary-blue) !important;
	color: var(--primary-blue) !important;
}

.search-box-wrapper {
	position: relative;
	margin-top: 12px;
}

.modern-el-input ::v-deep .el-input__inner,
.modern-el-input ::v-deep .el-textarea__inner {
	background-color: var(--bg-app) !important;
	border-color: var(--border-color) !important;
	color: var(--text-p) !important;
	border-radius: 8px;
	font-size: 13px;
	transition: border-color 0.2s;
}

.modern-el-input ::v-deep .el-input__inner:focus,
.modern-el-input ::v-deep .el-textarea__inner:focus {
	border-color: var(--primary-blue) !important;
}

.modern-el-input ::v-deep .el-input__prefix {
	color: var(--text-muted);
}

.menu-list {
	flex: 1;
	overflow-y: auto;
	padding: 0 12px 20px 12px;
}

.empty-hint {
	text-align: center;
	padding: 30px 0;
	color: var(--text-muted);
	font-size: 13px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.empty-hint i {
	font-size: 24px;
}

.menu-item {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	height: 40px;
	padding: 0 12px;
	margin-bottom: 4px;
	border-radius: 8px;
	color: var(--text-muted);
	cursor: pointer;
	transition: all 0.2s;
	box-sizing: border-box;
}

.menu-item:hover {
	background-color: var(--hover-sidebar);
	color: var(--text-h1);
}

.menu-item.active {
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	font-weight: 600;
}

.menu-left {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
}

.menu-cat-icon {
	font-size: 16px;
}

.menu-text-wrapper {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	margin-left: 10px;
}

.menu-text {
	font-size: 14px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.shared-icon-tag {
	margin-left: 6px;
	font-size: 12px;
	color: var(--primary-blue);
}

.menu-badge {
	margin-left: 8px;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	background-color: var(--border-color);
	padding: 2px 6px;
	border-radius: 12px;
	flex-shrink: 0;
}

.menu-item.active .menu-badge {
	background-color: var(--primary-blue);
	color: white;
}

.category-inline-input {
	margin-left: 8px;
	flex: 1;
}

.category-inline-input ::v-deep .el-input__inner {
	height: 26px;
	line-height: 26px;
	padding: 0 8px;
	font-size: 13px;
}

.menu-more {
	width: 24px;
	height: 24px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	color: transparent;
	transition: all 0.2s;
}

.menu-item:hover .menu-more,
.menu-item.active .menu-more {
	color: var(--text-muted);
}

.menu-more:hover {
	background-color: var(--border-color);
	color: var(--text-h1) !important;
}

.bp-main {
	flex: 1;
	padding: 0;
	overflow-y: auto;
	scroll-behavior: smooth;
	position: relative;
}

.main-content-container {
	max-width: 1080px;
	margin: 0 auto;
	padding: 40px 30px 100px 30px;
}

.main-header {
	margin-bottom: 24px;
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.category-badge-group {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
}

.category-badge {
	display: inline-block;
	font-size: 12px;
	font-weight: 600;
	color: var(--primary-blue);
	letter-spacing: 1px;
	text-transform: uppercase;
}

.category-creator-badge {
	font-size: 11px;
	font-weight: 500;
	color: var(--text-muted);
	background-color: var(--hover-sidebar);
	padding: 2px 8px;
	border-radius: 12px;
	border: 1px solid var(--border-color);
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.category-creator-badge i {
	color: var(--primary-blue);
}

.category-title {
	margin: 0 0 8px 0;
	font-size: 32px;
	font-weight: 800;
	color: var(--text-h1);
	letter-spacing: -0.5px;
}

.category-subtitle {
	margin: 0;
	font-size: 14px;
	color: var(--text-muted);
}

.main-header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
}

.main-search {
	width: 260px;
	margin-top: 0;
}

.category-switch-enter-active {
	transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.category-switch-leave-active {
	transition: opacity 0.12s cubic-bezier(0.16, 1, 0.3, 1), transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

.category-switch-enter {
	opacity: 0;
	transform: translateY(14px);
}
.category-switch-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}

.card-deck-wrapper {
	margin-bottom: 32px;
	background-color: rgba(14, 165, 233, 0.03);
	border: 1px dashed var(--border-color);
	border-radius: 14px;
	padding: 16px 20px;
	transition: all 0.3s;
}

.deck-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.deck-title {
	display: flex;
	align-items: center;
	font-size: 14px;
	font-weight: 700;
	color: var(--text-h1);
	gap: 8px;
}

.deck-title i {
	color: var(--primary-blue);
	font-size: 16px;
}

.deck-badge {
	font-size: 11px;
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 10px;
	font-weight: 600;
}

.deck-toggle-btn {
	padding: 0 !important;
	font-size: 13px !important;
	color: var(--text-muted) !important;
}

.deck-toggle-btn:hover {
	color: var(--primary-blue) !important;
}

.card-deck-grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 12px;
	margin-top: 8px;
}

.deck-card {
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: 10px;
	padding: 12px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 105px;
	cursor: pointer;
	box-shadow: var(--shadow-sm);
	position: relative;
	overflow: hidden;
	transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s, border-color 0.25s;

	animation: dealCard 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
	animation-delay: calc(var(--card-index) * 0.045s);
}

@keyframes dealCard {
	0% {
		opacity: 0;
		transform: translateY(-25px) scale(0.75) rotate(-3deg);
	}
	100% {
		opacity: 1;
		transform: translateY(0) scale(1) rotate(0deg);
	}
}

.deck-card:hover {
	transform: translateY(-6px) scale(1.02);
	border-color: var(--primary-blue);
	box-shadow: 0 10px 22px rgba(14, 165, 233, 0.2);
}

.deck-card-top {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
}

.deck-card-badge {
	font-size: 10px;
	font-weight: 800;
	color: var(--primary-blue);
	background-color: var(--active-sidebar);
	padding: 1px 5px;
	border-radius: 4px;
	font-family: monospace;
	flex-shrink: 0;
}

.deck-card-title {
	margin: 0;
	font-size: 13px;
	font-weight: 600;
	color: var(--text-h1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
}

.deck-card-preview {
	margin: 0;
	font-size: 11px;
	color: var(--text-muted);
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	text-overflow: ellipsis;
	word-break: break-all;
}

.deck-card-footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: 4px;
}

.deck-card-action {
	font-size: 10px;
	font-weight: 600;
	color: var(--primary-blue);
	opacity: 0.85;
	transition: opacity 0.2s;
}

.deck-card:hover .deck-card-action {
	opacity: 1;
}

@media (max-width: 1200px) {
	.card-deck-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

.quick-scroll-widget {
	position: fixed;
	right: 36px;
	bottom: 36px;
	z-index: 99;
	display: flex;
	flex-direction: column;
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: 24px;
	padding: 4px;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
}

.scroll-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	color: var(--text-muted);
	cursor: pointer;
	transition: all 0.2s ease;
}

.scroll-btn:hover {
	background-color: var(--hover-sidebar);
	color: var(--primary-blue);
	transform: scale(1.12);
}

.scroll-divider {
	height: 1px;
	width: 20px;
	margin: 2px auto;
	background-color: var(--border-color);
}

.check-all-box {
	margin-right: 4px;
	color: var(--text-muted);
	flex-shrink: 0;
	white-space: nowrap;
}

.export-btn {
	border-radius: 8px !important;
	color: var(--text-p) !important;
	border-color: var(--border-color) !important;
	background-color: var(--bg-card) !important;
	box-shadow: var(--shadow-sm);
}

.export-btn:hover {
	border-color: var(--primary-blue) !important;
	color: var(--primary-blue) !important;
}

.batch-mode-banner {
	background-color: var(--active-sidebar);
	border: 1px solid rgba(14, 165, 233, 0.3);
	border-radius: 12px;
	padding: 14px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
	box-shadow: 0 4px 12px rgba(14, 165, 233, 0.05);
}

.batch-banner-left {
	color: var(--primary-blue);
	font-size: 14px;
	display: flex;
	align-items: center;
}

.batch-banner-left i {
	margin-right: 8px;
	font-size: 18px;
}

.batch-banner-left strong {
	background-color: var(--primary-blue);
	color: white;
	padding: 0 8px;
	border-radius: 12px;
	margin: 0 4px;
}

.batch-banner-right {
	display: flex;
	gap: 12px;
}

.problem-list {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	box-sizing: border-box;
}

.problem-item-wrapper {
	display: flex;
	align-items: center;
	width: 100%;
}

.outer-checkbox-wrapper {
	width: 0;
	height: 36px;
	opacity: 0;
	overflow: hidden;
	transform: translateX(-30px);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.problem-list.is-batch-mode .outer-checkbox-wrapper {
	width: 36px;
	opacity: 1;
	margin-right: 16px;
	transform: translateX(0);
}

.outer-checkbox {
	pointer-events: none;
}

.outer-checkbox ::v-deep .el-checkbox__label {
	display: none !important;
}

.outer-checkbox ::v-deep .el-checkbox__inner {
	width: 24px !important;
	height: 24px !important;
	border-radius: 50% !important;
	border: 2px solid #94a3b8 !important;
	background-color: transparent !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.outer-checkbox ::v-deep .el-checkbox__inner::after {
	box-sizing: content-box;
	content: "";
	border: 2px solid #FFF;
	border-left: 0;
	border-top: 0;
	height: 11px !important;
	left: 7px !important;
	position: absolute;
	top: 3px !important;
	width: 5px !important;
	transform: rotate(45deg) scaleY(0) !important;
	transform-origin: center;
	transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner::after {
	transform: rotate(45deg) scaleY(1) !important;
}

.outer-checkbox-wrapper:hover .outer-checkbox ::v-deep .el-checkbox__inner {
	border-color: var(--primary-blue) !important;
}

.outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
	background-color: var(--primary-blue) !important;
	border-color: var(--primary-blue) !important;
	box-shadow: 0 0 12px rgba(14, 165, 233, 0.5);
}

.bp-wrapper.is-dark .outer-checkbox ::v-deep .el-checkbox__inner {
	border-color: #64748b !important;
}

.bp-wrapper.is-dark .outer-checkbox-wrapper:hover .outer-checkbox ::v-deep .el-checkbox__inner,
.bp-wrapper.is-dark .outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
	border-color: var(--primary-blue) !important;
}

.problem-card {
	flex: 1;
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	box-shadow: var(--shadow-card);
	transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
	overflow: hidden;
}

.problem-card.is-target-highlight {
	animation: cardTargetPulse 2.2s ease-in-out;
}

@keyframes cardTargetPulse {
	0%, 100% {
		border-color: var(--border-color);
		box-shadow: var(--shadow-card);
	}
	20%, 65% {
		border-color: var(--primary-blue);
		box-shadow: 0 0 28px rgba(14, 165, 233, 0.5);
		transform: scale(1.015);
	}
}

.problem-list.is-batch-mode .problem-card {
	cursor: pointer;
}

.bp-wrapper.is-dark .problem-card:hover {
	border-color: rgba(56, 189, 248, 0.4);
	box-shadow: 0 0 20px rgba(56, 189, 248, 0.05), var(--shadow-card);
}

.problem-card.is-selected {
	border-color: var(--primary-blue);
	box-shadow: 0 0 0 1px var(--primary-blue), var(--shadow-card);
}

.card-header {
	padding: 20px 24px;
	border-bottom: 1px solid var(--border-color);
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	background-color: rgba(0, 0, 0, 0.01);
}

.card-title-group {
	display: flex;
	align-items: flex-start;
	flex: 1;
	min-width: 0;
}

.index-badge {
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 700;
	margin-right: 16px;
	margin-top: 2px;
	font-family: monospace;
	flex-shrink: 0;
}

.editable-text-wrapper {
	display: inline-flex;
	align-items: center;
	padding: 2px 8px;
	margin-left: -8px;
	border-radius: 6px;
	cursor: pointer;
	border: 1px dashed transparent;
	transition: all 0.2s;
}

.editable-text-wrapper:hover {
	background-color: var(--hover-sidebar);
	border-color: var(--border-color);
}

.editable-text {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
	color: var(--text-h1);
	line-height: 1.4;
}

.editable-text-wrapper .edit-icon {
	margin-left: 10px;
	font-size: 14px;
	color: var(--text-muted);
	opacity: 0;
}

.editable-text-wrapper:hover .edit-icon {
	opacity: 1;
}

.card-header-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8px;
	flex-shrink: 0;
}

.update-time {
	font-size: 12px;
	color: var(--text-muted);
}

.action-icons {
	display: flex;
	gap: 12px;
	align-items: center;
}

.icon-btn {
	padding: 0 !important;
	font-size: 16px !important;
	color: var(--text-muted) !important;
	transition: color 0.2s;
}

.icon-btn:hover {
	color: var(--primary-blue) !important;
}

.card-delete-btn {
	color: #ef4444 !important;
	opacity: 0.6;
}

.card-delete-btn:hover {
	opacity: 1;
	color: #ef4444 !important;
}

.card-body {
	padding: 20px 24px 24px 24px;
}

.doc-meta-bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 12px;
	margin-bottom: 16px;
	padding: 6px 12px;
	background-color: var(--hover-sidebar);
	border-radius: 8px;
	font-size: 12px;
	border: 1px solid var(--border-color);
}

.meta-item {
	display: flex;
	align-items: center;
	color: var(--text-muted);
}

.meta-item i {
	margin-right: 4px;
	font-size: 13px;
	color: var(--primary-blue);
}

.meta-label {
	color: var(--text-muted);
	font-size: 12px;
}

.meta-value {
	font-weight: 600;
	color: var(--text-h1);
}

.author-name {
	color: #10b981;
}

.updater-name {
	color: #0ea5e9;
}

.meta-divider {
	width: 1px;
	height: 12px;
	background-color: var(--border-color);
}

.read-only-share-tag {
	font-size: 11px;
	font-weight: 600;
	padding: 1px 6px;
	border-radius: 4px;
	color: var(--text-muted);
	background-color: var(--border-color);
}

.shared-user-name-chip {
	font-size: 12px;
	font-weight: 600;
	color: var(--primary-blue);
}

.more-users-count-tag {
	font-size: 11px;
	font-weight: 700;
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 1px 6px;
	border-radius: 10px;
	margin-left: 4px;
	cursor: pointer;
}

.manage-share-btn {
	padding: 0 4px !important;
	font-size: 12px !important;
	color: var(--text-muted) !important;
	margin-left: 6px;
}

.manage-share-btn:hover {
	color: var(--primary-blue) !important;
}

.share-dialog-content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.share-filter-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.quick-select-btns {
	display: flex;
	gap: 8px;
	flex-shrink: 0;
}

.user-select-list-wrapper {
	max-height: 280px;
	overflow-y: auto;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	padding: 12px;
	background-color: var(--bg-app);
}

.empty-user-hint {
	text-align: center;
	padding: 24px 0;
	color: var(--text-muted);
	font-size: 13px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.user-checkbox-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
}

.user-checkbox-item .el-checkbox {
	width: 100%;
	margin-right: 0 !important;
	display: flex;
	align-items: center;
}

.share-summary-bar {
	font-size: 12px;
	color: var(--text-muted);
	background-color: var(--hover-sidebar);
	padding: 8px 12px;
	border-radius: 6px;
	border: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	gap: 6px;
}

.share-summary-bar i {
	color: var(--primary-blue);
}

.share-summary-bar strong {
	color: var(--primary-blue);
}

.shared-users-popover-content {
	padding: 6px;
}

.popover-sub-title {
	font-size: 12px;
	font-weight: 700;
	color: var(--text-h1);
	margin-bottom: 8px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.shared-user-tag-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	max-height: 160px;
	overflow-y: auto;
}

.shared-user-badge {
	font-size: 11px;
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 12px;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.editors-trigger {
	display: inline-flex;
	align-items: center;
	cursor: pointer;
	color: var(--text-p);
	font-weight: 500;
	transition: color 0.2s;
}

.editors-trigger:hover {
	color: var(--primary-blue);
}

.editor-badge {
	margin-right: 2px;
}

.more-count {
	font-size: 11px;
	background-color: var(--border-color);
	color: var(--text-muted);
	padding: 0 4px;
	border-radius: 4px;
	margin-left: 4px;
}

.meta-version-badge {
	margin-left: auto;
	font-size: 11px;
	font-weight: 700;
	font-family: monospace;
	background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.15));
	color: var(--primary-blue);
	padding: 1px 6px;
	border-radius: 4px;
	border: 1px solid rgba(14, 165, 233, 0.2);
}

.editors-popover-content {
	padding: 6px 4px;
}

.editors-title {
	font-size: 12px;
	font-weight: 700;
	color: var(--text-h1);
	margin-bottom: 8px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.editors-tag-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.editor-chip {
	font-size: 11px;
	background-color: var(--active-sidebar);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 12px;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.solution-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	flex-wrap: wrap;
	gap: 12px;
}

.solution-header-left {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
}

.solution-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-h1);
	display: flex;
	align-items: center;
}

.solution-label i {
	color: var(--primary-blue);
	margin-right: 8px;
	font-size: 16px;
}

.md-tag {
	font-size: 11px;
	background-color: rgba(14, 165, 233, 0.15);
	color: var(--primary-blue);
	padding: 2px 8px;
	border-radius: 4px;
	margin-left: 8px;
	font-weight: 600;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.attachment-badge {
	display: inline-flex;
	align-items: center;
	background-color: rgba(14, 165, 233, 0.1);
	border: 1px solid rgba(14, 165, 233, 0.3);
	color: var(--primary-blue);
	padding: 4px 10px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.attachment-badge:hover {
	background-color: rgba(14, 165, 233, 0.2);
	box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15);
}

.attachment-badge .file-name {
	max-width: 140px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin: 0 6px;
}

.remove-file-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	color: var(--primary-blue);
	transition: all 0.2s;
}

.remove-file-btn:hover {
	background-color: rgba(239, 68, 68, 0.15);
	color: #ef4444;
}

.solution-actions {
	display: flex;
	gap: 12px;
	align-items: center;
}

.action-btn {
	font-size: 12px;
	font-weight: 500;
	color: var(--text-muted);
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 6px 10px;
	border-radius: 6px;
	background-color: var(--hover-sidebar);
	transition: all 0.2s;
}

.action-btn i {
	margin-right: 6px;
	font-size: 14px;
}

.action-btn:hover {
	color: var(--primary-blue);
	background-color: var(--active-sidebar);
}

.editable-block {
	background-color: var(--code-bg);
	color: var(--code-text);
	padding: 20px 24px;
	border-radius: 10px;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 14px;
	line-height: 1.7;
	border: 1px solid var(--border-color);
	transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

.plain-code {
	white-space: pre-wrap;
	word-break: break-all;
	color: var(--text-p);
	font-family: "JetBrains Mono", Consolas, monospace;
}

.markdown-body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	line-height: 1.7;
	color: var(--text-p);
	word-break: break-word;
}

.markdown-body ::v-deep img,
.markdown-body img {
	max-width: 100%;
	border-radius: 8px;
	margin: 8px 0;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.markdown-body ::v-deep h1,
.markdown-body ::v-deep h2,
.markdown-body ::v-deep h3,
.markdown-body ::v-deep h4 {
	color: var(--text-h1);
	font-weight: 700;
	margin: 16px 0 10px 0;
}

.markdown-body ::v-deep h1 { font-size: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.markdown-body ::v-deep h2 { font-size: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.markdown-body ::v-deep h3 { font-size: 16px; }

.markdown-body ::v-deep p { margin: 8px 0; color: var(--text-p); }
.markdown-body ::v-deep hr { border: none; border-top: 1px solid var(--border-color); margin: 16px 0; }

.markdown-body ::v-deep code {
	background-color: rgba(14, 165, 233, 0.12);
	color: var(--primary-blue);
	padding: 3px 6px;
	border-radius: 4px;
	font-family: "JetBrains Mono", Consolas, monospace;
	font-size: 13px;
}

/* =========================================================
   代码块深度修复样式 (统一边框、背景与复制按钮原生重置)
   ========================================================= */

/* 1. 代码块最外层统一包裹容器 */
.code-block-wrapper,
.markdown-body ::v-deep .code-block-wrapper {
	position: relative !important;
	margin: 14px 0 !important;
	border-radius: 8px !important;
	overflow: hidden !important;
	background-color: #0f172a !important; /* 深蓝极客色统一背景 */
	border: 1px solid #1e293b !important;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
	display: block !important;
}

.bp-wrapper.is-dark .code-block-wrapper,
.bp-wrapper.is-dark .markdown-body ::v-deep .code-block-wrapper {
	background-color: #090d16 !important;
	border-color: #1e293b !important;
}

/* 2. 代码块 Header 头部结构 */
.code-block-header,
.markdown-body ::v-deep .code-block-header {
	display: flex !important;
	justify-content: space-between !important;
	align-items: center !important;
	padding: 8px 14px !important;
	background-color: rgba(255, 255, 255, 0.05) !important;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
	font-size: 12px !important;
	user-select: none !important;
	box-sizing: border-box !important;
	width: 100% !important;
}

.bp-wrapper.is-dark .code-block-header,
.bp-wrapper.is-dark .markdown-body ::v-deep .code-block-header {
	background-color: rgba(255, 255, 255, 0.03) !important;
	border-bottom-color: rgba(255, 255, 255, 0.06) !important;
}

/* 3. 语言 label 标签 */
.code-lang-label,
.markdown-body ::v-deep .code-lang-label {
	font-family: "JetBrains Mono", Consolas, Monaco, monospace !important;
	font-weight: 700 !important;
	font-size: 11px !important;
	color: #38bdf8 !important; /* 亮天蓝标识 */
	letter-spacing: 0.8px !important;
	text-transform: uppercase !important;
	line-height: 1 !important;
}

/* 4. 复制按钮样式彻底重置（清除浏览器默认白色外框与黑字） */
.code-copy-btn,
button.code-copy-btn,
.markdown-body ::v-deep .code-copy-btn,
.markdown-body ::v-deep button.code-copy-btn {
	appearance: none !important;
	-webkit-appearance: none !important;
	-moz-appearance: none !important;
	background: rgba(255, 255, 255, 0.08) !important;
	border: 1px solid rgba(255, 255, 255, 0.15) !important;
	color: #cbd5e1 !important;
	border-radius: 6px !important;
	padding: 4px 10px !important;
	font-size: 11px !important;
	line-height: 1.2 !important;
	cursor: pointer !important;
	outline: none !important;
	display: inline-flex !important;
	align-items: center !important;
	gap: 5px !important;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
	box-shadow: none !important;
	font-family: inherit !important;
	margin: 0 !important;
	vertical-align: middle !important;
}

.code-copy-btn i,
.markdown-body ::v-deep .code-copy-btn i {
	font-size: 13px !important;
	color: inherit !important;
}

/* 复制按钮 Hover 悬浮态 */
.code-copy-btn:hover,
button.code-copy-btn:hover,
.markdown-body ::v-deep .code-copy-btn:hover {
	background: rgba(14, 165, 233, 0.25) !important;
	color: #38bdf8 !important;
	border-color: rgba(56, 189, 248, 0.5) !important;
	transform: translateY(-1px) !important;
}

/* 复制按钮成功点击态 */
.code-copy-btn.copied,
button.code-copy-btn.copied,
.markdown-body ::v-deep .code-copy-btn.copied {
	background: rgba(16, 185, 129, 0.2) !important;
	color: #34d399 !important;
	border-color: rgba(52, 211, 153, 0.5) !important;
}

/* 5. 消除 code-block-wrapper 内 pre 标签的内嵌独立边框与外边距 */
.code-block-wrapper pre,
.markdown-body .code-block-wrapper pre,
.markdown-body ::v-deep .code-block-wrapper pre {
	margin: 0 !important;
	padding: 14px 16px !important;
	background-color: transparent !important;
	border: none !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	overflow-x: auto !important;
}

/* 6. 统一格式化代码文本 */
.code-block-wrapper pre code,
.markdown-body .code-block-wrapper pre code,
.markdown-body ::v-deep .code-block-wrapper pre code {
	background-color: transparent !important;
	padding: 0 !important;
	border: none !important;
	border-radius: 0 !important;
	color: #f8fafc !important;
	font-family: "JetBrains Mono", Consolas, Monaco, "Andale Mono", monospace !important;
	font-size: 13px !important;
	line-height: 1.6 !important;
	white-space: pre !important;
	word-break: normal !important;
	word-wrap: normal !important;
}

/* 7. 兜底处理通用（非 Wrapper 包裹）的独立原生 pre 块 */
.markdown-body ::v-deep pre:not(.code-block-wrapper pre) {
	background-color: #0f172a !important;
	color: #f8fafc !important;
	padding: 14px 16px !important;
	border-radius: 8px !important;
	font-family: "JetBrains Mono", Consolas, monospace !important;
	font-size: 13px !important;
	line-height: 1.6 !important;
	overflow-x: auto !important;
	margin: 14px 0 !important;
	border: 1px solid #1e293b !important;
}

.markdown-body ::v-deep pre:not(.code-block-wrapper pre) code {
	background-color: transparent !important;
	color: inherit !important;
	padding: 0 !important;
	border: none !important;
}

.markdown-body ::v-deep blockquote {
	border-left: 4px solid var(--primary-blue);
	background-color: var(--hover-sidebar);
	padding: 10px 14px;
	margin: 10px 0;
	border-radius: 0 6px 6px 0;
	color: var(--text-muted);
}

.markdown-body ::v-deep table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.markdown-body ::v-deep th, .markdown-body ::v-deep td { border: 1px solid var(--border-color); padding: 8px 12px; text-align: left; }
.markdown-body ::v-deep th { background-color: var(--hover-sidebar); color: var(--text-h1); }

.dialog-md-preview-wrapper {
	margin-top: 12px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	padding: 12px 16px;
	background-color: var(--bg-app);
}

.dialog-md-preview-wrapper .preview-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
	margin-bottom: 8px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.dialog-preview-body {
	max-height: 220px;
	overflow-y: auto;
	padding: 12px;
	background-color: var(--bg-card);
	border-radius: 6px;
	border: 1px solid var(--border-color);
}

.empty-state {
	margin-top: 80px;
	display: flex;
	flex-direction: column;
	align-items: center;
	color: var(--text-muted);
}

.empty-art {
	font-size: 64px;
	color: var(--border-color);
	margin-bottom: 20px;
}

.empty-state h3 {
	color: var(--text-h1);
	margin: 0 0 8px 0;
}

.pagination-wrapper {
	display: flex;
	justify-content: flex-end;
	margin-top: 40px;
	padding-top: 24px;
	border-top: 1px solid var(--border-color);
}

.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active {
	background-color: var(--primary-blue);
	color: white;
	border-color: var(--primary-blue);
	box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .btn-next,
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .btn-prev,
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li {
	background-color: var(--bg-card);
	color: var(--text-p);
	border: 1px solid var(--border-color);
	border-radius: 6px;
	transition: all 0.2s;
}

.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li:not(.disabled):not(.active):hover {
	color: var(--primary-blue);
	border-color: var(--primary-blue);
}

.bp-wrapper.is-dark ::v-deep .el-pagination button:disabled {
	background-color: var(--bg-card);
	color: var(--text-muted);
	border-color: var(--border-color);
}

.bp-wrapper.is-dark ::v-deep .el-pagination__total,
.bp-wrapper.is-dark ::v-deep .el-pagination__jump {
	color: var(--text-muted);
}

.bp-wrapper.is-dark ::v-deep .el-pagination__jump .el-input__inner,
.bp-wrapper.is-dark ::v-deep .el-pagination__sizes .el-input__inner {
	background-color: var(--bg-app);
	border-color: var(--border-color);
	color: var(--text-p);
}

.undo-toast {
	position: fixed;
	top: 80px;
	left: 50%;
	margin-left: -160px;
	width: 320px;
	background-color: #ffffff;
	border: 1px solid #e2e8f0;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
	border-radius: 12px;
	padding: 14px 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	z-index: 999999;
}

.undo-toast.is-dark-toast {
	background-color: #18181b;
	border-color: #27272a;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}

.undo-toast-content {
	display: flex;
	align-items: center;
	font-size: 14px;
	color: #0f172a;
	font-weight: 500;
}

.undo-toast.is-dark-toast .undo-toast-content {
	color: #f8fafc;
}

.countdown-text {
	color: #f59e0b;
	font-size: 16px;
	margin: 0 4px;
	min-width: 20px;
	display: inline-block;
	text-align: center;
}

.undo-btn {
	border-radius: 6px !important;
}

.toast-slide-down-enter-active,
.toast-slide-down-leave-active {
	transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-down-enter,
.toast-slide-down-leave-to {
	opacity: 0;
	transform: translateY(-20px) scale(0.95);
}

.custom-success-toast {
	position: fixed;
	top: 24px;
	left: 50%;
	transform: translateX(-50%);
	background-color: #f0fdf4;
	border: 1px solid #bbf7d0;
	color: #16a34a;
	padding: 12px 24px;
	border-radius: 30px;
	display: flex;
	align-items: center;
	font-size: 14px;
	font-weight: 500;
	z-index: 999999;
	box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.1);
}

.custom-success-toast.is-dark-toast {
	background-color: rgba(22, 163, 74, 0.15);
	border-color: rgba(22, 163, 74, 0.3);
	color: #4ade80;
}

.toast-slide-up-enter-active,
.toast-slide-up-leave-active {
	transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-up-enter,
.toast-slide-up-leave-to {
	opacity: 0;
	transform: translate(-50%, -20px);
}

.bp-wrapper ::v-deep .modern-dialog {
	border-radius: 12px;
	overflow: hidden;
}

.bp-wrapper.is-dark ::v-deep .modern-dialog {
	background-color: var(--bg-card);
	border: 1px solid var(--border-color);
}

.bp-wrapper.is-dark ::v-deep .el-dialog__title,
.bp-wrapper.is-dark ::v-dark .el-form-item__label {
	color: var(--text-h1);
}

.bp-wrapper.is-dark ::v-deep .el-input__inner,
.bp-wrapper.is-dark ::v-deep .el-textarea__inner {
	background-color: var(--bg-app) !important;
	border-color: var(--border-color) !important;
	color: var(--text-p) !important;
}

.bp-wrapper.is-dark ::v-deep .el-input__inner:focus,
.bp-wrapper.is-dark ::v-deep .el-textarea__inner:focus {
	border-color: var(--primary-blue) !important;
}

.bp-wrapper.is-dark ::v-deep .el-loading-mask {
	background-color: rgba(0, 0, 0, 0.75) !important;
	backdrop-filter: blur(4px);
}

.dialog-danger-content {
	display: flex;
	align-items: flex-start;
	color: #ef4444;
	font-size: 15px;
	margin: 10px 0;
}

.dialog-danger-content i {
	font-size: 24px;
	margin-right: 12px;
	margin-top: -2px;
}

.mobile-sidebar-backdrop {
	position: absolute;
	top: 56px;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 90;
	backdrop-filter: blur(2px);
}

@media (max-width: 768px) {
	.bp-header { padding: 0 10px; height: 56px; }
	.header-left { gap: 8px; flex-shrink: 0; }
	.logo-text { font-size: 15px; }
	.header-actions { gap: 6px; flex-shrink: 0; }

	.header-actions .btn-text { display: none !important; }
	.header-actions .el-button { padding: 7px 9px !important; }
	.header-actions .el-button [class*="el-icon-"] { margin-right: 0 !important; font-size: 14px; }
	.header-actions .divider { margin: 0 2px; height: 18px; }
	.theme-btn { width: 32px; height: 32px; font-size: 16px; }
	.avatar-wrapper { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

	.bp-body { height: calc(100vh - 56px); position: relative; }

	.bp-sidebar {
		position: absolute;
		top: 0; left: 0; bottom: 0;
		z-index: 100;
		width: 260px !important;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.25);
		transform: translateX(0);
	}
	
	.bp-sidebar.is-collapsed {
		transform: translateX(-100%);
		width: 260px !important;
		opacity: 1 !important;
	}

	.main-content-container { padding: 16px 12px 60px 12px; }
	.scrollbar-markers-track { display: none !important; }
	.main-header { flex-direction: column; align-items: stretch; gap: 16px; }
	.category-title { font-size: 22px; }
	.main-header-actions { flex-direction: column; align-items: stretch; width: 100%; }
	.main-search { width: 100% !important; }
	.card-deck-grid { grid-template-columns: repeat(2, 1fr) !important; }

	.card-header { padding: 12px; flex-direction: column; align-items: stretch; gap: 8px; }
	.card-header-actions { flex-direction: row; justify-content: space-between; align-items: center; width: 100%; }

	.doc-meta-bar { flex-wrap: wrap; gap: 6px; padding: 8px; }
	.meta-divider { display: none; }
	.user-checkbox-grid { grid-template-columns: repeat(2, 1fr) !important; }

	.solution-header { flex-direction: column; align-items: stretch; gap: 10px; }
	.solution-actions { flex-wrap: wrap; justify-content: flex-start; gap: 6px; }
	.action-btn { padding: 4px 8px; font-size: 11px; }

	.pagination-wrapper { justify-content: center; padding-top: 16px; }
	.pagination-wrapper ::v-deep .el-pagination { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; }
	.pagination-wrapper ::v-deep .el-pagination .el-pager li { min-width: 26px !important; height: 26px !important; line-height: 26px !important; margin: 0 2px !important; font-size: 12px !important; }
	.pagination-wrapper ::v-deep .el-pagination button { height: 26px !important; line-height: 26px !important; min-width: 26px !important; padding: 0 4px !important; }

	.quick-scroll-widget { right: 16px; bottom: 20px; }
	.ai-floating-fab { right: 16px; bottom: 115px; width: 42px; height: 42px; }
	.undo-toast { width: 90% !important; left: 5% !important; margin-left: 0 !important; top: 64px !important; }
	.preview-iframe-container { height: 380px; }
}
</style>