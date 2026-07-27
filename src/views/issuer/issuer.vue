<template>
	<div class="bp-wrapper" :class="{ 'is-dark': isDark }" v-loading="pageLoading"
		element-loading-background="rgba(0, 0, 0, 0.8)">

		<!-- 全局隐藏的文件上传 Input -->
		<input type="file" ref="hiddenFileInput" style="display: none" @change="handleFileUpload" />

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
				<el-button class="glow-btn primary-gradient-btn" size="small" icon="el-icon-plus"
					@click="openProblemDialog">
					录入新故障
				</el-button>
				<div class="divider"></div>
				<div class="theme-btn" @click="toggleTheme" :title="isDark ? '切换到白天模式' : '切换到暗黑深邃模式'">
					<i :class="isDark ? 'el-icon-sunny' : 'el-icon-moon'"></i>
				</div>

				<!-- 头像及下拉菜单 -->
				<el-popover placement="bottom-end" width="160" trigger="click" :visible-arrow="false"
					:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
					<div class="action-menu-list">
						<div class="action-item" @click="handleUserCommand('history')">
							<i class="el-icon-time"></i> <span>历史记录</span>
						</div>
						<div class="action-divider"></div>
						<div class="action-item danger" @click="handleUserCommand('logout')">
							<i class="el-icon-switch-button"></i> <span>退出文档</span>
						</div>
					</div>
					<div slot="reference" class="avatar-wrapper">
						<el-avatar class="user-avatar" size="small"
							src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"></el-avatar>
					</div>
				</el-popover>
			</div>
		</header>

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
								<i v-if="cat.is_shared" class="el-icon-share shared-icon-tag" title="公开共享分类"></i>
								<span class="menu-badge" v-if="cat.docCount > 0">{{ cat.docCount }}</span>
							</div>
						</div>

						<el-popover :ref="'popover_' + cat.id" placement="right-start" width="200" trigger="click"
							:visible-arrow="false"
							:popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'">
							<div class="action-menu-list">
								<!-- 仅当当前登录用户为分类创建者时，才展示公开共享开关 -->
								<template v-if="canManageShare(cat)">
									<div class="action-item switch-action-item" @click.stop>
										<div class="switch-item-left">
											<i class="el-icon-share"></i>
											<span>公开共享分类</span>
										</div>
										<el-switch
											v-model="cat.is_shared"
											size="mini"
											active-color="#0ea5e9"
											@change="handleCategoryShareChange(cat)"
											@click.native.stop>
										</el-switch>
									</div>
									<div class="action-divider"></div>
								</template>

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
				<div class="main-content-container">

					<div class="main-header">
						<div class="category-meta">
							<!-- 当前目录分类创建者展示 -->
							<div class="category-badge-group">
								<span class="category-badge">当前目录</span>
								<span v-if="currentCategory && currentCategory.creator" class="category-creator-badge" title="目录创建者">
									<i class="el-icon-user"></i> {{ currentCategory.creator.username }} 创建
								</span>
							</div>

							<h1 class="category-title">{{ currentCategoryName }}</h1>
							<p class="category-subtitle">
								共收录 {{ computedTotalProblems }} 个故障解决方案
								<span v-if="currentCategory && currentCategory.createdAt">
									· 创建于 {{ currentCategory.createdAt.split('T')[0] }}
								</span>
							</p>
						</div>

						<div class="main-header-actions">
							<div class="search-box-wrapper main-search">
								<el-input class="modern-el-input" v-model="searchProblemQuery"
									placeholder="搜索故障 (支持标题/内容)" prefix-icon="el-icon-search" clearable></el-input>
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
									<div class="action-item" @click="exportToMarkdown('all')">
										<i class="el-icon-document-copy"></i> <span>直接导出当前页全量</span>
									</div>
									<div class="action-item" :class="{ 'is-disabled': selectedProblemIds.length === 0 }"
										@click="selectedProblemIds.length > 0 && exportToMarkdown('selected')">
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
								跨目录多选模式已开启。请在左侧勾选，目前已选中 <strong>{{ selectedProblemIds.length }}</strong> 篇文档。
							</div>
							<div class="batch-banner-right">
								<el-button size="mini" plain @click="toggleBatchMode">取 消</el-button>
								<el-button size="mini" type="primary" class="primary-gradient-btn"
									@click="exportToMarkdown('selected')"
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
										<span>目录故障卡牌速查</span>
										<span class="deck-badge">{{ currentProblems.length }} 篇本页快查</span>
									</div>
									<el-button type="text" class="deck-toggle-btn" @click="showCardOverview = !showCardOverview">
										<i :class="showCardOverview ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
										{{ showCardOverview ? '收起卡牌' : '展开卡牌' }}
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
								<p>{{ searchProblemQuery ? '请尝试更换搜索关键词或检查拼写' : '您可以点击右上角按钮录入第一条故障记录' }}</p>
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
													v-model="prob.title" size="small" class="inline-edit-input"
													@blur="finishEditTitle(prob)" @keyup.enter.native="finishEditTitle(prob)"
													@click.stop.native></el-input>
												<div v-else class="editable-text-wrapper" @click.stop="startEditTitle(prob.id)">
													<h3 class="editable-text">{{ prob.title }}</h3>
													<i class="el-icon-edit edit-icon" title="点击编辑"></i>
												</div>
											</div>

											<div class="card-header-actions" @click.stop>
												<span class="update-time"><i class="el-icon-time"></i> {{ prob.updatedAt || '刚刚' }}</span>
												<div class="action-icons">
													<el-button type="text" class="icon-btn" icon="el-icon-download"
														@click.stop="exportSingleProblem(prob)" title="仅导出此文档"></el-button>
													<el-button type="text" class="card-delete-btn icon-btn"
														icon="el-icon-delete" @click.stop="requestDeleteProblem(prob.id)"
														title="删除记录"></el-button>
												</div>
											</div>
										</div>

										<div class="card-body" @click.stop>
											<!-- 故障文档人员信息元数据栏 -->
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

												<!-- 参与编辑的人员列表Popover展示 -->
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

												<!-- 故障文档 is_shared 共享状态开关 (仅创建者展示 Switch 开关，非创建者仅展示只读标签) -->
												<div class="meta-item share-switch-item" :title="canManageShare(prob) ? '切换文档公开共享状态' : '文档公开共享状态'">
													<i class="el-icon-share"></i>
													<span class="meta-label">公开：</span>
													<el-switch
														v-if="canManageShare(prob)"
														v-model="prob.isShared"
														size="mini"
														active-color="#0ea5e9"
														@change="handleProblemShareChange(prob)"
														@click.native.stop>
													</el-switch>
													<span v-else class="read-only-share-tag" :class="{ 'is-public': prob.isShared }">
														{{ prob.isShared ? '公开' : '私有' }}
													</span>
												</div>

												<div class="meta-version-badge" v-if="prob.version">
													<span>v{{ prob.version }}</span>
												</div>
											</div>

											<!-- ======= 附件与排查思路头部 ======= -->
											<div class="solution-header">
												<div class="solution-header-left">
													<div class="solution-label">
														<i class="el-icon-magic-stick"></i> 排查思路与解决方案
														<span class="md-tag" v-if="isMarkdown(prob.solution)">
															<i class="el-icon-document-checked"></i> MD 格式
														</span>
													</div>

													<!-- 附件展示胶囊 -->
													<transition name="el-fade-in-linear">
														<div class="attachment-badge" v-if="prob.attachment"
															@click.stop="downloadFile(prob.attachment)" title="点击下载附件">
															<i class="el-icon-document"></i>
															<span class="file-name">{{ prob.attachment.name }}</span>
															<span class="remove-file-btn" @click.stop="removeAttachment(prob)"
																title="移除该附件">
																<i class="el-icon-close"></i>
															</span>
														</div>
													</transition>
												</div>

												<div class="solution-actions">
													<div class="action-btn" v-if="editSolutionId !== prob.id" @click.stop="startEditSolution(prob.id)">
														<i class="el-icon-edit"></i> <span>编辑文档</span>
													</div>
													<div class="action-btn is-active-item" v-else @click.stop="finishEditSolution(prob)">
														<i class="el-icon-check"></i> <span>保存修改</span>
													</div>
													<div class="copy-btn action-btn" v-if="!prob.attachment"
														@click.stop="triggerUpload(prob.id)">
														<i class="el-icon-paperclip"></i> <span>添加附件</span>
													</div>
													<div class="copy-btn action-btn" @click.stop="openMoveDialog(prob)">
														<i class="el-icon-folder-opened"></i> <span>移动分类</span>
													</div>

													<!-- 双模式复制下拉菜单 (复制原文 / 复制纯文本) -->
													<el-dropdown trigger="click" @command="(cmd) => handleCopyCommand(cmd, prob.solution)" @click.native.stop>
														<div class="copy-btn action-btn">
															<i class="el-icon-document-copy"></i> <span>复制</span> <i class="el-icon-arrow-down el-icon--right"></i>
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
												class="inline-edit-textarea" @blur="finishEditSolution(prob)"></el-input>
											
											<!-- 卡片主体 Markdown 渲染展示 -->
											<div v-else class="solution-code editable-block">
												<div v-if="isMarkdown(prob.solution)" class="markdown-body" v-html="renderMarkdown(prob.solution)"></div>
												<div v-else class="plain-code">{{ prob.solution }}</div>
											</div>
										</div>
									</div>

								</div>
							</el-checkbox-group>

							<!-- 6. 分页栏（total 实时绑定左侧选中分类的 docCount） -->
							<div class="pagination-wrapper" v-if="computedTotalProblems > 0 || currentProblems.length > 0">
								<el-pagination background 
									@size-change="handleSizeChange" 
									@current-change="handleCurrentChange"
									:current-page="currentPage" 
									:page-sizes="[5, 10, 20, 50]" 
									:page-size="pageSize"
									layout="total, sizes, prev, pager, next, jumper" 
									:total="computedTotalProblems">
								</el-pagination>
							</div>

						</div>
					</transition>

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

		<!-- 移动目录弹窗 -->
		<el-dialog v-dialogDrag title="移动故障文档到指定目录" :visible.sync="moveDialogVisible" width="450px" :close-on-click-modal="false"
			custom-class="modern-dialog">
			<el-form size="small" label-position="top">
				<el-form-item label="选择目标分类目录">
					<el-select v-model="moveToCategoryId" placeholder="请选择你要转移到的目标目录" style="width: 100%;"
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
		<el-dialog v-dialogDrag title="操作确认" :visible.sync="deleteDialogVisible" width="400px" :close-on-click-modal="false"
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
					<span>删除成功，<strong class="countdown-text">{{ undoCountdown }}</strong> 秒内可撤销。</span>
				</div>
				<el-button class="undo-btn" size="mini" @click="executeUndo" :loading="apiLoading">撤回恢复</el-button>
			</div>
		</transition>
		<transition name="toast-slide-up">
			<div class="custom-success-toast" v-if="toastVisible" :class="{ 'is-dark-toast': isDark }">
				<i class="el-icon-success"></i>
				<span>{{ toastMsg }}</span>
			</div>
		</transition>

		<!-- 新建分类窗 -->
		<el-dialog v-dialogDrag title="新建分类" :visible.sync="categoryVisible" width="400px" :close-on-click-modal="false"
			custom-class="modern-dialog">
			<el-form :model="categoryForm" ref="categoryForm" :rules="categoryRules" size="small" label-position="top" @submit.native.prevent="submitCategory">
				<el-form-item label="分类名称" prop="name">
					<el-input v-model="categoryForm.name" placeholder="例如: 前端工程化、数据库排错..." @keyup.enter.native="submitCategory"></el-input>
				</el-form-item>
			</el-form>
			<div slot="footer">
				<el-button @click="categoryVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
				<el-button type="primary" @click="submitCategory" size="small" :loading="apiLoading"
					class="primary-gradient-btn">确 认</el-button>
			</div>
		</el-dialog>

		<!-- 录入故障弹窗 -->
		<el-dialog v-dialogDrag :title="'在【' + currentCategoryName + '】中录入'" :visible.sync="problemVisible" width="700px"
			:close-on-click-modal="false" custom-class="modern-dialog">
			<el-form :model="problemForm" ref="problemForm" :rules="problemRules" size="small" label-position="top">
				<el-form-item label="故障现象描述 / 标题" prop="title">
					<el-input v-model="problemForm.title"
						placeholder="请描述报错信息或现象 (例如: Nginx 502 Bad Gateway)"></el-input>
				</el-form-item>
				<el-form-item label="排查思路与详细解决代码 (支持粘贴代码/图片/Markdown文本)" prop="solution">
					<el-input type="textarea" :autosize="{ minRows: 6, maxRows: 12 }" v-model="problemForm.solution"
						placeholder="可以粘贴 Bash 命令、日志、代码块、图片URL或 Markdown 文本..."></el-input>
				</el-form-item>

				<!-- 实时 Markdown 识别与预览 -->
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
} from '../../api';

import {
	Message,
	MessageBox
} from 'element-ui';

marked.setOptions({
	gfm: true,
	breaks: true,
});

const getNowDate = () => new Date().toISOString().split('T')[0];

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
		return {
			isDark: true,
			sidebarCollapsed: false,
			pageLoading: true,
			apiLoading: false,
			activeCategoryId: null,

			showScrollButtons: false,
			isContentVisible: true,

			cardDealKey: Date.now(),
			showCardOverview: true,
			highlightedProblemId: null,
			highlightTimer: null,

			currentPage: 1,
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
			searchCategoryQuery: '',
			searchProblemQuery: '',

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
		// ======== 获取当前系统登录用户信息 ========
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
		filteredCategories() {
			let result = this.categories;
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
		searchProblemQuery() {
			this.currentPage = 1;
		}
	},
	async created() {
		await this.fetchData();
	},
	methods: {
		// ======== 核心方法：校验当前登录用户是否为该分类/文档的创建者 ========
		canManageShare(item) {
			if (!item) return false;
			const curUser = this.currentUser;
			if (!curUser) return false;

			// 提取分类或文档关联的创建者信息
			const creator = item.creator || {};
			const creatorId = item.creatorId || item.creator_id || creator.id;
			const creatorUsername = creator.username || item.creatorName || '';

			// 提取当前登录用户 ID 和 Username
			const curUserId = curUser.id || curUser.userId || curUser.uid;
			const curUsername = curUser.username || curUser.name || curUser.sign || '';

			// 1. 优先校验 ID
			if (curUserId !== undefined && curUserId !== null && creatorId !== undefined && creatorId !== null) {
				if (Number(curUserId) === Number(creatorId)) {
					return true;
				}
			}

			// 2. 兜底校验用户名
			if (curUsername && creatorUsername) {
				if (String(curUsername).trim().toLowerCase() === String(creatorUsername).trim().toLowerCase()) {
					return true;
				}
			}

			return false;
		},

		handleScroll(e) {
			const scrollTop = e.target.scrollTop;
			this.showScrollButtons = scrollTop > 150;
		},

		scrollToTop() {
			const mainContainer = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');
			if (mainContainer) {
				mainContainer.scrollTo({
					top: 0,
					behavior: 'smooth'
				});
			}
		},

		scrollToBottom() {
			const mainContainer = this.$refs.mainScrollContainer || this.$el.querySelector('.bp-main');
			if (mainContainer) {
				mainContainer.scrollTo({
					top: mainContainer.scrollHeight,
					behavior: 'smooth'
				});
			}
		},

		async selectCategory(id) {
			if (Number(this.activeCategoryId) === Number(id)) return;

			this.isContentVisible = false;
			await new Promise(resolve => setTimeout(resolve, 140));

			this.activeCategoryId = Number(id);
			this.searchProblemQuery = '';
			this.currentPage = 1;
			this.cardDealKey = Date.now();

			await this.getProblems(1);

			this.$nextTick(() => {
				this.isContentVisible = true;
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
				setTimeout(() => {
					window.location.reload();
				}, 500);
			}).catch(() => {});
		},

		isMarkdown(text) {
			if (!text || typeof text !== 'string') return false;
			const mdPatterns = [
				/```[\s\S]*?```/,
				/`[^`]+`/,
				/!\[.*?\]\(.*?\)/,
				/\[.*?\]\(.*?\)/,
				/^#{1,6}\s+/m,
				/^\s*[-*+]\s+/m,
				/^\s*\d+\.\s+/m,
				/^\s*>\s+/m,
				/\*\*.+?\*\*/,
				/~~.+?~~/
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
			const targetId = cat.id;
			const newName = this.editCategoryName.trim() || '未命名分类';
			this.editCategoryId = null;

			cat.name = newName;

			this.apiLoading = true;
			try {
				const resp = await create_categories({
					id: targetId,
					name: newName,
					is_shared: cat.is_shared
				});
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

		async handleCategoryShareChange(cat) {
			try {
				const resp = await create_categories({
					id: cat.id,
					name: cat.name,
					is_shared: cat.is_shared
				});
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000) {
					this.showToast(`【${cat.name}】已${cat.is_shared ? '设置为公开共享' : '取消公开共享'}`);
				} else {
					cat.is_shared = !cat.is_shared;
					this.showToast(res?.msg || '修改分类共享状态失败');
				}
			} catch (err) {
				cat.is_shared = !cat.is_shared;
				console.error('handleCategoryShareChange error:', err);
				this.showToast('修改共享状态失败，网络异常');
			}
		},

		async handleProblemShareChange(prob) {
			try {
				const resp = await create_problems({
					id: prob.id,
					category_id: prob.categoryId,
					title: prob.title,
					solution: prob.solution,
					is_shared: prob.isShared
				});
				const res = resp?.data?.code !== undefined ? resp.data : resp;
				if (res && res.code === 1000) {
					this.showToast(`故障文档【${prob.title}】已${prob.isShared ? '设置为公开共享' : '设为私有'}`);
				} else {
					prob.isShared = !prob.isShared;
					this.showToast(res?.msg || '修改文档共享状态失败');
				}
			} catch (err) {
				prob.isShared = !prob.isShared;
				console.error('handleProblemShareChange error:', err);
				this.showToast('修改文档共享状态失败，网络异常');
			}
		},

		handleCategoryCommand(command, cat) {
			this.safeClosePopover(cat.id);
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
						creator: res.data.creator || null,
						createdAt: res.data.created_at || getNowDate(),
						problems: []
					};
					this.categories.push(newCat);
					this.activeCategoryId = newCat.id;
					this.cardDealKey = Date.now();
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
					page_size: this.pageSize
				};
				if (this.activeCategoryId) {
					params.category_id = Number(this.activeCategoryId);
				}

				const resp = await get_problems(params);
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.code === 200)) {
					const dataObj = res.data || {};
					console.log("dataObj >>> ", dataObj);
						
					if (typeof dataObj.total === 'number') {
						this.totalProblems = dataObj.total;
					} else if (typeof res.total === 'number') {
						this.totalProblems = res.total;
					}

					const list = Array.isArray(dataObj.list) ? dataObj.list : (Array.isArray(dataObj) ? dataObj : []);
					this.problems = list.map(p => this.formatProblem(p));
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
					this.cardDealKey = Date.now();
					this.showToast('新故障记录发布成功');
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

			let attachmentObj = null;
			if (Array.isArray(p.file_url) && p.file_url.length > 0) {
				const firstFile = p.file_url[0];
				attachmentObj = {
					id: firstFile.id,
					name: firstFile.name,
					url: firstFile.url,
					uploader: firstFile.uploader || null
				};
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
				version: p.version || 1,
				updatedAt: displayTime,
				creator: creatorObj,
				updatedBy: updatedByObj,
				editors: editorsList,
				attachment: attachmentObj
			};
		},

		async fetchData() {
			this.pageLoading = true;
			try {
				await this.getCategories(1);
				if (!this.activeCategoryId && this.categories.length > 0) {
					this.activeCategoryId = this.categories[0].id;
				}
				if (this.activeCategoryId) {
					await this.getProblems(1);
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
			await this.getProblems(1);
		},

		async handleCurrentChange(val) {
			this.currentPage = val;
			await this.getProblems(val);
		},

		triggerUpload(probId) {
			this.uploadTargetProbId = probId;
			this.$refs.hiddenFileInput.click();
		},

		async handleFileUpload(event) {
			const file = event.target.files[0];
			if (!file || !this.uploadTargetProbId) return;

			const formData = new FormData();
			formData.append('file', file);
			formData.append('problem_id', this.uploadTargetProbId);

			this.apiLoading = true;
			try {
				const resp = await upload_doc(formData);
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && (res.code === 1000 || res.url)) {
					const fileData = (res.data && res.data.url) ? res.data : res;

					const prob = this.problems.find(p => p.id === this.uploadTargetProbId);
					if (prob) {
						this.$set(prob, 'attachment', {
							id: fileData.id,
							name: fileData.name || file.name,
							url: fileData.url,
							uploader: fileData.uploader || null
						});
					}
					this.showToast(`附件 ${fileData.name || file.name} 上传成功！`);
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

		downloadFile(attachment) {
			if (!attachment || !attachment.url) {
				this.showToast('附件下载链接不存在');
				return;
			}
			const link = document.createElement('a');
			link.href = attachment.url;
			link.download = attachment.name || '附件文件';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			this.showToast('附件开始下载...');
		},

		async removeAttachment(prob) {
			if (!prob || !prob.id) return;
			this.apiLoading = true;
			try {
				const resp = await del_doc({ id: prob.id });
				const res = resp?.data?.code !== undefined ? resp.data : resp;

				if (res && res.code === 1000) {
					this.$set(prob, 'attachment', null);
					this.showToast('附件已移除成功');
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

		exportToMarkdown(mode) {
			if (this.$refs.exportPopover) {
				this.$refs.exportPopover.doClose();
			}

			let targetProblems = [];
			if (mode === 'all') {
				targetProblems = this.currentProblems;
			} else if (mode === 'selected') {
				targetProblems = this.problems.filter(p => this.selectedProblemIds.includes(p.id));
			}

			if (targetProblems.length === 0) {
				this.showToast('没有可导出的记录');
				return;
			}

			const fileName = mode === 'selected' ? '自定义选择_组合排错手册' : `${this.currentCategoryName}_排错手册`;
			this.generateMarkdownAndDownload(targetProblems, fileName);

			if (mode === 'selected') {
				this.isBatchMode = false;
				this.selectedProblemIds = [];
			}
		},

		exportSingleProblem(prob) {
			this.generateMarkdownAndDownload([prob], `${prob.title}_单篇排错日志`);
		},

		generateMarkdownAndDownload(targetProblems, fileName) {
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
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${fileName}.md`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			this.showToast('Markdown 文档生成并下载成功！');
		},

		openMoveDialog(prob) {
			this.moveTargetProblem = prob;
			this.moveToCategoryId = prob.categoryId;
			this.moveDialogVisible = true;
		},

		async confirmMoveProblem() {
			if (!this.moveToCategoryId || !this.moveTargetProblem) {
				this.showToast('请选择迁移的目标目录');
				return;
			}
			this.apiLoading = true;
			try {
				const targetId = this.moveTargetProblem.id;
				const oldCatId = this.moveTargetProblem.categoryId;
				const newCatId = Number(this.moveToCategoryId);

				const resp = await update_problems_categories({
					pid: targetId,
					cid: newCatId
				});
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
				.replace(/```[\s\S]*?```/g, (match) => {
					return match.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
				})
				.replace(/`([^`]+)`/g, '$1')
				.replace(/!\[(.*?)\]\(.*?\)/g, '$1')
				.replace(/\[(.*?)\]\(.*?\)/g, '$1')
				.replace(/^#{1,6}\s+/gm, '')
				.replace(/^\s*>\s+/gm, '')
				.replace(/(\*\*|__)(.*?)\1/g, '$2')
				.replace(/(\*|_)(.*?)\1/g, '$2')
				.replace(/~~(.*?)~~/g, '$1')
				.replace(/^\s*[-*+]\s+/gm, '')
				.replace(/^\s*\d+\.\s+/gm, '')
				.replace(/^\s*[-*_]{3,}\s*$/gm, '')
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
			this.deleteTarget = { type: 'category', id: cat.id };
			this.deleteMessage = `确定删除【${cat.name}】目录及其关联的所有排错记录吗？`;
			this.deleteDialogVisible = true;
		},
		requestDeleteProblem(id) {
			this.deleteTarget = { type: 'problem', id: id };
			this.deleteMessage = `确定要永久删除这条故障记录吗？`;
			this.deleteDialogVisible = true;
		},

		async confirmDelete() {
			if (!this.deleteTarget) return;
			const targetType = this.deleteTarget.type;
			const targetId = this.deleteTarget.id;
			let backupData = null;

			this.apiLoading = true;
			try {
				if (targetType === 'category') {
					const index = this.categories.findIndex(c => Number(c.id) === Number(targetId));
					if (index !== -1) {
						backupData = {
							type: 'category', catIndex: index,
							category: { ...this.categories[index] },
							problems: this.problems.filter(p => Number(p.categoryId) === Number(targetId))
						};
						this.categories.splice(index, 1);
						this.problems = this.problems.filter(p => Number(p.categoryId) !== Number(targetId));
						if (Number(this.activeCategoryId) === Number(targetId)) {
							this.activeCategoryId = this.categories.length > 0 ? this.categories[0].id : null;
						}
					}
				}
				else if (targetType === 'problem') {
					const index = this.problems.findIndex(p => p.id === targetId);
					if (index !== -1) {
						const deletedProb = this.problems[index];
						backupData = {
							type: 'problem', probIndex: index, problem: { ...deletedProb }
						};
						this.problems.splice(index, 1);

						const cat = this.categories.find(c => Number(c.id) === Number(deletedProb.categoryId));
						if (cat && Array.isArray(cat.problems)) {
							cat.problems = cat.problems.filter(p => p.id !== targetId);
						}

						this.selectedProblemIds = this.selectedProblemIds.filter(sid => sid !== targetId);
					}
				}
			} finally {
				this.apiLoading = false;
				this.deleteDialogVisible = false;
				this.deleteTarget = null;
				if (backupData) this.triggerUndoToast(backupData);
			}
		},

		triggerUndoToast(backupData) {
			if (this.undoTimer) clearInterval(this.undoTimer);
			this.undoData = backupData;
			this.undoCountdown = 20;
			this.undoTimer = setInterval(() => {
				this.undoCountdown--;
				if (this.undoCountdown <= 0) {
					clearInterval(this.undoTimer);
					this.undoTimer = null;
					this.undoData = null;
				}
			}, 1000);
		},

		async executeUndo() {
			if (!this.undoData) return;
			const backupData = this.undoData;
			this.apiLoading = true;
			try {
				this.undoData = null;
				if (this.undoTimer) { clearInterval(this.undoTimer); this.undoTimer = null; }

				if (backupData.type === 'category') {
					this.categories.splice(backupData.catIndex, 0, backupData.category);
					this.problems.push(...backupData.problems);
					this.activeCategoryId = backupData.category.id;
				}
				else if (backupData.type === 'problem') {
					this.problems.splice(backupData.probIndex, 0, backupData.problem);
					const cat = this.categories.find(c => Number(c.id) === Number(backupData.problem.categoryId));
					if (cat && Array.isArray(cat.problems)) {
						cat.problems.unshift(backupData.problem);
					}
					this.activeCategoryId = backupData.problem.categoryId;
				}
			} finally {
				this.apiLoading = false;
			}
		},

		safeClosePopover(id) {
			const popover = this.$refs['popover_' + id];
			if (popover) {
				if (Array.isArray(popover)) { if (popover[0]) popover[0].doClose(); }
				else { popover.doClose(); }
			}
		},

		startEditTitle(id) {
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
			this.problemForm = { title: '', solution: '' };
			this.problemVisible = true;
			this.$nextTick(() => { this.$refs.problemForm && this.$refs.problemForm.clearValidate(); });
		},
		async submitProblem() {
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
}

.bp-sidebar {
	width: 280px;
	flex-shrink: 0;
	background-color: var(--bg-sidebar);
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column !important;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
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

.modern-el-input ::v-deep .el-input__inner {
	background-color: var(--bg-app) !important;
	border-color: var(--border-color);
	color: var(--text-p);
	border-radius: 8px;
	font-size: 13px;
	transition: border-color 0.2s;
}

.modern-el-input ::v-deep .el-input__inner:focus {
	border-color: var(--primary-blue);
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

@media (max-width: 768px) {
	.card-deck-grid {
		grid-template-columns: repeat(2, 1fr);
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

/* 非创建者只读共享状态标签样式 */
.read-only-share-tag {
	font-size: 11px;
	font-weight: 600;
	padding: 1px 6px;
	border-radius: 4px;
	color: var(--text-muted);
	background-color: var(--border-color);
}

.read-only-share-tag.is-public {
	color: var(--primary-blue);
	background-color: var(--active-sidebar);
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

.attachment-badge i.el-icon-document {
	font-size: 14px;
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

.markdown-body ::v-deep h1 { 
	font-size: 20px; 
	border-bottom: 1px solid var(--border-color); 
	padding-bottom: 6px; 
}
.markdown-body ::v-deep h2 { 
	font-size: 18px; 
	border-bottom: 1px solid var(--border-color); 
	padding-bottom: 6px; 
}
.markdown-body ::v-deep h3 { font-size: 16px; }

.markdown-body ::v-deep p {
	margin: 8px 0;
	color: var(--text-p);
}

.markdown-body ::v-deep hr {
	border: none;
	border-top: 1px solid var(--border-color);
	margin: 16px 0;
}

.markdown-body ::v-deep code {
	background-color: rgba(14, 165, 233, 0.12);
	color: var(--primary-blue);
	padding: 3px 6px;
	border-radius: 4px;
	font-family: "JetBrains Mono", Consolas, monospace;
	font-size: 13px;
}

.markdown-body ::v-deep pre {
	background-color: #0f172a;
	color: #f8fafc;
	padding: 16px;
	border-radius: 8px;
	font-family: "JetBrains Mono", Consolas, monospace;
	font-size: 13px;
	line-height: 1.6;
	overflow-x: auto;
	margin: 12px 0;
	border: 1px solid #1e293b;
}

.markdown-body ::v-deep pre code {
	background-color: transparent;
	color: inherit;
	padding: 0;
}

.bp-wrapper.is-dark .markdown-body ::v-deep pre {
	background-color: #09090b;
	border-color: #27272a;
	color: #f8fafc;
}

.markdown-body ::v-deep blockquote {
	border-left: 4px solid var(--primary-blue);
	background-color: var(--hover-sidebar);
	padding: 10px 14px;
	margin: 10px 0;
	border-radius: 0 6px 6px 0;
	color: var(--text-muted);
}

.markdown-body ::v-deep table {
	border-collapse: collapse;
	width: 100%;
	margin: 12px 0;
}

.markdown-body ::v-deep th,
.markdown-body ::v-deep td {
	border: 1px solid var(--border-color);
	padding: 8px 12px;
	text-align: left;
}

.markdown-body ::v-deep th {
	background-color: var(--hover-sidebar);
	color: var(--text-h1);
}

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

.bp-wrapper.is-dark ::v-deep .el-pagination__jump .el-input__inner {
	background-color: var(--bg-app);
	border-color: var(--border-color);
	color: var(--text-p);
}

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
.bp-wrapper.is-dark ::v-deep .el-form-item__label {
	color: var(--text-h1);
}

.bp-wrapper.is-dark ::v-deep .el-input__inner,
.bp-wrapper.is-dark ::v-deep .el-textarea__inner {
	background-color: var(--code-bg);
	border-color: var(--border-color);
	color: var(--text-p);
}

.bp-wrapper.is-dark ::v-deep .el-input__inner:focus,
.bp-wrapper.is-dark ::v-deep .el-textarea__inner:focus {
	border-color: var(--primary-blue);
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
</style>

<style>
.action-menu-list {
	display: flex;
	flex-direction: column;
}

.action-item {
	padding: 10px 16px;
	font-size: 13px;
	cursor: pointer;
	display: flex;
	align-items: center;
	transition: all 0.2s;
	font-weight: 500;
}

.switch-action-item {
	justify-content: space-between;
	cursor: default;
}

.switch-item-left {
	display: flex;
	align-items: center;
}

.switch-item-left i {
	margin-right: 10px;
	font-size: 16px;
}

.action-item i {
	margin-right: 10px;
	font-size: 16px;
}

.action-item.danger {
	color: #ef4444;
}

.action-item.danger:hover {
	color: #f87171;
}

.action-item.is-disabled {
	opacity: 0.4;
	cursor: not-allowed;
	pointer-events: none;
}

.action-item.is-active-item {
	color: #0ea5e9;
	background-color: rgba(14, 165, 233, 0.1);
}

.action-divider {
	height: 1px;
	margin: 4px 0;
}

.custom-dark-popover {
	background-color: #18181b !important;
	border: 1px solid #27272a !important;
	padding: 6px 0 !important;
	border-radius: 12px !important;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
}

.custom-dark-popover .action-item,
.custom-dark-popover .el-dropdown-menu__item {
	color: #cbd5e1 !important;
}

.custom-dark-popover .action-item:hover:not(.switch-action-item),
.custom-dark-popover .el-dropdown-menu__item:hover {
	background-color: #27272a !important;
	color: #38bdf8 !important;
}

.custom-dark-popover .action-divider {
	background-color: #27272a;
}

.custom-dark-popover .is-active-item {
	color: #38bdf8 !important;
	background-color: rgba(56, 189, 248, 0.1) !important;
}

.custom-light-popover {
	padding: 6px 0 !important;
	border-radius: 12px !important;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
	border: 1px solid #e2e8f0 !important;
}

.custom-light-popover .action-item,
.custom-light-popover .el-dropdown-menu__item {
	color: #334155 !important;
}

.custom-light-popover .action-item:hover:not(.switch-action-item),
.custom-light-popover .el-dropdown-menu__item:hover {
	background-color: #f1f5f9 !important;
	color: #0ea5e9 !important;
}

.custom-light-popover .action-divider {
	background-color: #e2e8f0;
}

.custom-dark-select {
	background-color: #18181b !important;
	border: 1px solid #27272a !important;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
}

.custom-dark-select .el-select-dropdown__item {
	color: #cbd5e1 !important;
}

.custom-dark-select .el-select-dropdown__item.hover,
.custom-dark-select .el-select-dropdown__item:hover {
	background-color: #27272a !important;
}

.custom-dark-select .el-select-dropdown__item.selected {
	color: #38bdf8 !important;
	background-color: rgba(56, 189, 248, 0.1) !important;
	font-weight: bold;
}

.custom-dark-select .el-select-dropdown__item.is-disabled {
	color: #64748b !important;
}

.custom-dark-select .popper__arrow::after {
	border-bottom-color: #18181b !important;
}

.custom-light-select {
	border-radius: 8px !important;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
	border: 1px solid #e2e8f0 !important;
}
</style>