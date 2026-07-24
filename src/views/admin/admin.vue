<template>
	<div id="app" class="layout-container">

		<aside class="left-sidebar" :class="{ 'collapsed': isCollapsed }">

			<div class="sidebar-header">
				<span class="app-title" v-show="!isCollapsed">ProTrader</span>

				<div class="toggle-btn" @click="toggleSidebar">
					<i :class="isCollapsed ? 'fas fa-bars' : 'fas fa-outdent'"></i>
				</div>
			</div>

			<div class="nav-menu">

				<!-- <div class="nav-item" :class="{ 'active': $route.path === '/stock/total/list' }"
					@click="handleNav('/stock/total/list')" :title="isCollapsed ? '大盘数据' : ''">
					<div class="icon-box">
						<i class="fas fa-chart-line"></i>
					</div>
					<span class="nav-text" v-show="!isCollapsed">大盘数据</span>
				</div>

				<div class="nav-item" :class="{ 'active': $route.path === '/stock/trade/list' }"
					@click="handleNav('/stock/trade/list')" :title="isCollapsed ? '模拟交易' : ''">
					<div class="icon-box">
						<i class="fas fa-exchange-alt"></i>
					</div>
					<span class="nav-text" v-show="!isCollapsed">模拟交易</span>
				</div> -->

				<!-- <div class="nav-item" :class="{ 'active': $route.path === '/golden_cus/list' }"
					@click="handleNav('/golden_cus/list')" :title="isCollapsed ? '黄金变动数据' : ''">
					<div class="icon-box">
						<i class="fas fa-coins"></i>
					</div>
					<span class="nav-text" v-show="!isCollapsed">黄金变动数据</span>
				</div> -->

				<!-- 底部系统设置：点击打开 Dialog -->
				<div class="nav-bottom">
					<div class="nav-item" @click="settingsVisible = true" :title="isCollapsed ? '系统设置' : ''">
						<div class="icon-box"><i class="fas fa-cog"></i></div>
						<span class="nav-text" v-show="!isCollapsed">系统设置</span>
					</div>
				</div>

			</div>
		</aside>

		<main class="right-content">
			<keep-alive>
				<router-view class="page-viewport"></router-view>
			</keep-alive>
		</main>

		<!-- ================== 系统设置精美弹窗 ================== -->
		<el-dialog
			v-dialogDrag
			title="⚙️ 系统与个性化设置"
			:visible.sync="settingsVisible"
			width="380px"
			center
			:append-to-body="true"
			:close-on-click-modal="false"
			custom-class="premium-settings-dialog"
		>
			<div class="settings-body">
				
				<!-- 1. 用户信息卡片 -->
				<div class="user-card">
					<div class="avatar-box">
						<i class="fas fa-user-shield"></i>
					</div>
					<div class="user-info">
						<div class="name">{{ user }}</div>
						<div class="role">超级管理员 / 核心交易员</div>
					</div>
				</div>

				<!-- 2. 设置列表组 -->
				<div class="settings-group">
					<!-- 主题切换 -->
					<div class="setting-item">
						<span class="label">
							<i :class="isDark ? 'fas fa-moon' : 'fas fa-sun'" :style="{ color: isDark ? '#a78bfa' : '#f59e0b' }"></i> 
							深色模式
						</span>
						<el-switch
							v-model="isDark"
							active-color="#3b82f6"
							inactive-color="#d1d5db"
							@change="handleThemeChange"
						></el-switch>
					</div>

					<!-- 消息通知配置 -->
					<div class="setting-item" style="flex-direction: column; align-items: stretch; gap: 12px;">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div class="setting-info">
								<span class="label">
									<i class="fas fa-bell" style="color: #60a5fa;"></i> 
									交易消息通知
								</span>
								<p class="notice-type" style="margin-left: 30px; margin-top: 4px;">仅支持飞书机器人内通知</p>
							</div>
							<div class="setting-action">
								<el-switch
									v-model="notify"
									active-color="#3b82f6"
									inactive-color="#d1d5db"
									@change="stockNoticeSwitch"
								></el-switch>
							</div>
						</div>
						<!-- 独立的飞书配置入口按钮 -->
						<button class="premium-config-btn" @click="openFeishuConfig">
							<i class="fas fa-sliders-h"></i> 配置消息通知
						</button>
					</div>

					<!-- =================新增：AI 助手配置入口================= -->
					<div class="setting-item" style="flex-direction: column; align-items: stretch; gap: 12px;">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div class="setting-info">
								<span class="label">
									<i class="fas fa-robot" style="color: #10b981;"></i> 
									AI 助手配置
								</span>
								<p class="notice-type" style="margin-left: 30px; margin-top: 4px;">配置大语言模型及鉴权参数</p>
							</div>
						</div>
						<button class="premium-config-btn ai-config-btn" @click="openAiConfig">
							<i class="fas fa-cogs"></i> 配置 AI 参数
						</button>
					</div>
					
				</div>
			</div>

			<!-- 3. 底部退出登录按钮 -->
			<span slot="footer" class="dialog-footer">
				<button class="premium-logout-btn" @click="handleLogout">
					<i class="fas fa-sign-out-alt"></i> 安全退出系统
				</button>
			</span>
		</el-dialog>

		<!-- ================== 飞书机器人配置 专属弹窗 ================== -->
		<el-dialog
			v-dialogDrag
			title="🤖 飞书机器人配置"
			:visible.sync="feishuVisible"
			width="420px"
			center
			:append-to-body="true"
			:close-on-click-modal="false"
			custom-class="premium-settings-dialog"
			@close="cancelFeishuConfig"
		>
			<div class="feishu-form-body">
				<div class="form-group">
					<label class="form-label">Webhook 地址 <span class="required">*</span></label>
					<input 
						type="text" 
						class="premium-input" 
						v-model="feishuConfig.webhook" 
						placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." 
					/>
				</div>
				<div class="form-group">
					<label class="form-label">关键词 <span class="required">*</span></label>
					<input 
						type="text" 
						class="premium-input" 
						v-model="feishuConfig.keyword" 
						placeholder="例如：交易提醒 (需与飞书群机器人设置一致)" 
					/>
				</div>
				<div class="form-tips">
					<i class="fas fa-info-circle"></i> 必须设置，否则无法及时发送股票行情消息。请确保飞书群机器人安全设置中已添加该自定义关键词，否则消息将无法送达。
				</div>
			</div>
			
			<span slot="footer" class="dialog-footer flex-footer">
				<el-button type="default" @click="cancelFeishuConfig">取 消</el-button>
				<el-button :loading="configLoading" type="primary" @click="set_feishu_config">
					<i class="fas fa-save"></i> 保 存 配 置
				</el-button>
				<el-button :loading="sendLoading" type="danger" @click="test_send_feishu_msg">
					<i class="fas fa-paper-plane"></i> 测试发送
				</el-button>
			</span>
		</el-dialog>

		<!-- ================== 优化：AI 配置 专属弹窗 ================== -->
		<el-dialog
			v-dialogDrag
			title="🧠 AI 助手参数配置"
			:visible.sync="aiVisible"
			width="420px"
			center
			:append-to-body="true"
			:close-on-click-modal="false"
			custom-class="premium-settings-dialog"
			@close="cancelAiConfig"
		>
			<div class="feishu-form-body">
				<!-- 服务商预设下拉框 -->
				<div class="form-group">
					<label class="form-label">AI 服务商 (Preset) <span class="required">*</span></label>
					<el-select v-model="aiConfig.preset" placeholder="请选择 AI 服务商" @change="handleAiPresetChange" style="width: 100%;">
						<el-option label="DeepSeek" value="deepseek"></el-option>
						<el-option label="Gemini" value="gemini"></el-option>
					</el-select>
				</div>
				<!-- API 接口地址 -->
				<div class="form-group">
					<label class="form-label">接口地址 (apiUrl) <span class="required">*</span></label>
					<el-input v-model="aiConfig.apiUrl" placeholder="请先选择上方服务商或手动输入" clearable></el-input>
				</div>
				<!-- 密钥输入 -->
				<div class="form-group">
					<label class="form-label">API 密钥 (Key) <span class="required">*</span></label>
					<el-input v-model="aiConfig.apiKey" placeholder="API 密钥" show-password clearable></el-input>
				</div>
			</div>
			
			<span slot="footer" class="dialog-footer flex-footer">
				<el-button type="default" @click="cancelAiConfig">取 消</el-button>
				<el-button type="success" @click="saveAiConfig">
					<i class="fas fa-save"></i> 保 存 配 置
				</el-button>
			</span>
		</el-dialog>

	</div>
</template>

<script>
// import {
// 	stock_notice_switch, // 股票消息通知开关接口
// 	send_feishu_msg, // 测试发送飞书消息接口
// 	feishu_config, // 飞书配置接口
// 	get_ai_config, // 获取ai配置
// 	set_ai_config, // 提交ai配置
// } from '../../api';

import {
	Message,
	MessageBox
} from 'element-ui';

export default {
	name: 'admin',
	directives: {
		// 自定义 Vue 指令实现 Element UI 弹窗头部拖拽功能
		dialogDrag: {
			bind(el) {
				const dialogHeaderEl = el.querySelector('.el-dialog__header');
				const dragDom = el.querySelector('.el-dialog');
				if (!dialogHeaderEl || !dragDom) return;
				
				dialogHeaderEl.style.cursor = 'move';
				dialogHeaderEl.style.userSelect = 'none'; // 避免拖动时意外选中文字

				// 获取弹窗的计算样式
				const sty = dragDom.currentStyle || window.getComputedStyle(dragDom, null);

				dialogHeaderEl.onmousedown = (e) => {
					e.preventDefault(); // 阻止浏览器默认选择行为
					
					// 鼠标按下，计算当前鼠标与对话框内部相对位移
					const disX = e.clientX - dialogHeaderEl.offsetLeft;
					const disY = e.clientY - dialogHeaderEl.offsetTop;

					// 获取先前的 left/top style 相对偏移量值
					let styL = sty.left;
					let styT = sty.top;

					// 转换 'auto' 及百分比数值
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
						// 计算鼠标移动偏差
						const l = e.clientX - disX;
						const t = e.clientY - disY;

						// 叠加初始位移并应用
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
			configLoading: false,
			sendLoading: false,
			user: "",
			isCollapsed: true,     
			settingsVisible: false, 
			feishuVisible: false,   
			aiVisible: false,       

			isDark: true,
			notify: false,          
			privacy: false,

			feishuConfig: {
				webhook: '',
				keyword: ''
			},

			// AI配置数据对象 (已适配你的需求字段)
			aiConfig: {
                mode: '',
                preset: '',
                apiKey: '',
                apiUrl: '',
                model: ''
            },

			aiConfigList: [], // 返回的元素数据格式就是aiConfig
		};
	},
	computed: {
		// 根据选中的服务商(preset)动态返回支持的模型列表
		availableModels() {
            if (this.aiConfig.preset === 'gemini') {
                return [
                    'gemini-3.1-flash-lite',
                    'gemini-3.1-pro-preview',
                    'gemini-3.5-flash'
                ];
            } else if (this.aiConfig.preset === 'deepseek') {
                return [
                    'deepseek-chat'
                ];
            }
            return [];
        }
	},
	beforeDestroy() {
        this.$root.$off('theme-change');
    },
	async created() {
		// this.user = localStorage.getItem('sign') || 'Admin';
		// this.initTheme();
		// await this.initSettings();
		// this.$root.$on('theme-change', (val) => {
        //     this.isDark = val;
        //     this.applyTheme();
        // });
		// this.stockNoticeSwitch(3); 
	},

	methods: {
		// ============= 设置ai =============
		// async setAiConfig() {
		// 	try {
		// 		const resp = await set_ai_config({
		// 			mode: this.aiConfig.mode,
		// 			preset: this.aiConfig.preset,
		// 			apiKey: this.aiConfig.apiKey,
		// 			apiUrl: this.aiConfig.apiUrl,
		// 			model: this.aiConfig.model
		// 		});

		// 		if (resp && resp.data && resp.data.code === 1000) {
		// 			const configData = resp.data.data;
		// 			// 确保将获取的数据格式转为列表存入本地
		// 			this.aiConfigList = Array.isArray(configData) ? configData : (configData ? [configData] : []);
		// 			this.aiConfig = this.aiConfigList.find(item => item.preset === this.aiConfig.preset) || this.aiConfig;
					
		// 			// 存储到localstorage的stock_ai_config统一使用列表结构
		// 			localStorage.setItem('stock_ai_config', JSON.stringify(this.aiConfigList));
		// 			Message.success(resp.data.msg || 'AI 配置保存成功');
		// 			return true;
		// 		} else {
		// 			Message.error(resp.data.msg || 'AI 配置保存失败');
		// 			return false;
		// 		}
		// 	} catch (error) {
		// 		console.error(error);
		// 		Message.error('请求接口保存 AI 配置异常');
		// 		return false;
		// 	}
		// },

		// // ============= 获取ai配置 =============
		// async getAiConfig() {
		// 	try {
		// 		const resp = await get_ai_config();
		// 		if (resp && resp.data && resp.data.code === 1000) {
		// 			const configData = resp.data.data;
					
		// 			if (!configData || (Array.isArray(configData) && configData.length === 0)) {
		// 				this.aiConfigList = [];
		// 			} else {
		// 				this.aiConfigList = Array.isArray(configData) ? configData : [configData];
		// 				this.aiConfig = this.aiConfigList.find(item => item.preset === this.aiConfig.preset) || this.aiConfigList[0];
		// 				// 存储至本地 stock_ai_config 保持列表格式
		// 				localStorage.setItem('stock_ai_config', JSON.stringify(this.aiConfigList));
		// 			}
		// 		}
		// 	} catch (error) {
		// 		console.error(error);
		// 	}
		// },

		// // ================= AI 配置联动方法 =================
		// handleAiPresetChange(val) {
		// 	const existing = this.aiConfigList.find(item => item.preset === val);
		// 	if (val === 'deepseek') {
		// 		this.aiConfig.apiUrl = 'https://api.deepseek.com/chat/completions';
		// 		this.aiConfig.model = 'deepseek-chat';
		// 		this.aiConfig.apiKey = existing ? existing.apiKey : '';
		// 	} else if (val === 'gemini') {
		// 		this.aiConfig.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
		// 		this.aiConfig.model = 'gemini-3.5-flash';
		// 		this.aiConfig.apiKey = existing ? existing.apiKey : '';
		// 	}
        // },

		// async set_feishu_config() {
		// 	if (!this.feishuConfig.webhook) {
		// 		Message.error('Webhook 地址不能为空');
		// 		return;
		// 	}
		// 	if (!this.feishuConfig.keyword) {
		// 		Message.error('关键词不能为空');
		// 		return;
		// 	}
		// 	this.configLoading = true;
		// 	const resp = await feishu_config({web_hook: this.feishuConfig.webhook, word: this.feishuConfig.keyword});
		// 	if (resp && resp.data && resp.data.code === 1000) {
		// 	    Message.success(resp.data.msg || '飞书配置成功');
		// 	} else {
		// 	    Message.error(resp.data.msg || '飞书配置失败');
		// 	}
		// 	this.configLoading = false;
		// },

		// async test_send_feishu_msg() {
		// 	this.sendLoading = true;
		// 	const resp = await send_feishu_msg();
		// 	if (resp && resp.data && resp.data.code === 1000) {
		// 		Message.success('测试消息已发送，请检查飞书群是否收到');
		// 	} else {
		// 		Message.error(resp.data.msg || '测试消息发送失败');
		// 	}
		// 	this.sendLoading = false;
		// },

		// async stockNoticeSwitch(active) {
		// 	var status = 1; 
		// 	if (active === 3) {
		// 		status = active;
		// 	} else {
		// 		status = this.notify ? 2 : 1;
		// 	}
		// 	const resp = await stock_notice_switch({ status: status });
		// 	if (resp && resp.data && resp.data.code === 1000) {
		// 		this.notify = resp.data.data == 2;
		// 	} else {
		// 		Message.error(resp.data.msg || '操作失败，请稍后再试');
		// 		this.notify = !this.notify; 
		// 	}
		// },

		// toggleSidebar() {
		// 	this.isCollapsed = !this.isCollapsed;
		// },
		// handleNav(path) {
		// 	if (this.$route.path === path) return;
		// 	this.$router.push(path).catch(err => {
		// 		if (err.name !== 'NavigationDuplicated') console.error(err);
		// 	});
		// },
		
		// // ===== 初始化与主题切换逻辑 =====
		// initTheme() {
		// 	const savedTheme = localStorage.getItem('app-theme-dark');
		// 	if (savedTheme !== null) {
		// 		this.isDark = savedTheme === 'true';
		// 	}
		// 	this.applyTheme();
		// },
		// handleThemeChange(val) {
		// 	localStorage.setItem('app-theme-dark', val);
		// 	this.applyTheme();
        //     this.$root.$emit('theme-change', val);
		// },
		// applyTheme() {
		// 	if (this.isDark) {
		// 		document.body.classList.add('global-theme-dark');
		// 		document.body.classList.remove('global-theme-light');
		// 	} else {
		// 		document.body.classList.add('global-theme-light');
		// 		document.body.classList.remove('global-theme-dark');
		// 	}
		// },

		// async initSettings() {
		// 	// 初始化飞书
		// 	const savedFeishu = localStorage.getItem('feishu-config');
		// 	if (savedFeishu) {
		// 		this.feishuConfig = JSON.parse(savedFeishu);
		// 		this.notify = localStorage.getItem('app-notify') === 'true';
		// 	}
		// 	// 初始化AI配置
		// 	const savedAi = localStorage.getItem('stock_ai_config');
		// 	if (savedAi) {
		// 		try {
		// 			const parsed = JSON.parse(savedAi);
		// 			// 确保解析为数组
		// 			if (Array.isArray(parsed)) {
		// 				this.aiConfigList = parsed;
		// 			} else {
		// 				this.aiConfigList = [parsed];
		// 			}
		// 			// 设定当前选中的默认项
		// 			if (this.aiConfigList.length > 0) {
		// 				this.aiConfig = this.aiConfigList.find(item => item.preset === this.aiConfig.preset) || this.aiConfigList[0];
		// 			}
		// 		} catch (e) {
		// 			console.error('解析本地 stock_ai_config 出现异常', e);
		// 		}
		// 	} else {
		// 		// 当 localstorage 中不存在这个 key：stock_ai_config，静默向后端请求数据
		// 		await this.getAiConfig();
		// 	}
		// },

		// // ===== 飞书面板独立操作逻辑 =====
		// openFeishuConfig() {
		// 	this.feishuVisible = true;
		// },
		// cancelFeishuConfig() {
		// 	this.feishuVisible = false;
		// },

		// // ===== AI 面板独立操作逻辑 =====
		// openAiConfig() {
		// 	this.aiVisible = true;
		// 	const savedAi = localStorage.getItem('stock_ai_config');
		// 	if (!savedAi || this.aiConfigList.length === 0) {
		// 		this.getAiConfig();
		// 	}
		// },
		// cancelAiConfig() {
		// 	this.aiVisible = false;
		// },
		// async saveAiConfig() {
		// 	if (!this.aiConfig.preset) {
		// 		Message.warning('请选择 AI 服务商 (Preset)');
		// 		return;
		// 	}
		// 	if (!this.aiConfig.apiUrl) {
		// 		Message.warning('接口地址不能为空');
		// 		return;
		// 	}
		// 	if (!this.aiConfig.apiKey) {
		// 		Message.warning('请输入apikey');
		// 		return;
		// 	}

		// 	this.aiConfig.mode = 'api';

		// 	// 调用接口保存，保存成功时会自动更新本地存储并将其转换为列表形式
		// 	const isSuccess = await this.setAiConfig();
		// 	if (isSuccess) {
		// 		this.aiVisible = false;
		// 	}
		// },

		// // ===== 退出系统逻辑 =====
		handleLogout() {
			MessageBox.confirm('确定要退出当前系统吗?', '退出确认', {
				confirmButtonText: '安全退出',
				cancelButtonText: '取消',
				type: 'warning',
				customClass: 'custom-logout-confirm'
			}).then(() => {
				localStorage.removeItem('sign');
				Message.success('已退出系统');
				this.settingsVisible = false;
				setTimeout(() => {
					window.location.reload();
				}, 500);
			}).catch(() => {});
		}
	}
}
</script>

<style>
/* ================= 全局基础与 CSS 变量 ================= */
html, body {
	margin: 0;
	padding: 0;
	height: 100%;
	width: 100%;
	overflow: hidden;
	font-family: "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	transition: background-color 0.3s;
}

@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

/* ====== 黑夜主题变量 ====== */
body.global-theme-dark {
	--bg-route-page: #121212;      
	--bg-panel: #1e1e1e;           
	--bg-card-inner: #2a2a2a;      
	--text-main: #f5f5f5;          
	--text-muted: #9ca3af;         
	--border-color: #333333;       
	background-color: var(--bg-route-page);
}

/* ====== 白天主题变量 ====== */
body.global-theme-light {
	--bg-route-page: #f3f4f6;
	--bg-panel: #ffffff;
	--bg-card-inner: #f9fafb;
	--text-main: #1f2937;
	--text-muted: #6b7280;
	--border-color: #e5e7eb;
	background-color: var(--bg-route-page);
}

/* ================== 精美自定义弹窗样式 ================== */
.premium-settings-dialog {
	background-color: var(--bg-panel) !important;
	border: 1px solid var(--border-color);
	border-radius: 16px !important;
	box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
}

/* 弹窗头部文字颜色适配 */
.premium-settings-dialog .el-dialog__title {
	color: var(--text-main) !important;
	font-weight: bold;
	font-size: 18px;
}
.premium-settings-dialog .el-dialog__header {
	border-bottom: 1px solid var(--border-color);
	padding-bottom: 15px;
}
.premium-settings-dialog .el-dialog__headerbtn .el-dialog__close {
	color: var(--text-muted);
}

/* 适配 el-input & el-select 黑暗模式 */
.premium-settings-dialog .el-input__inner {
	background-color: var(--bg-route-page) !important;
	border: 1px solid var(--border-color) !important;
	color: var(--text-main) !important;
	border-radius: 8px;
	padding: 12px 14px;
	height: 42px;
}
.premium-settings-dialog .el-input__inner:focus {
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.premium-settings-dialog .el-input__icon {
	color: var(--text-muted);
}

/* 弹窗内部样式 */
.settings-body {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* 1. 用户资料卡片 */
.user-card {
	display: flex;
	align-items: center;
	padding: 16px;
	background-color: var(--bg-card-inner);
	border-radius: 12px;
	border: 1px solid var(--border-color);
}
.user-card .avatar-box {
	width: 50px;
	height: 50px;
	border-radius: 12px;
	background: linear-gradient(135deg, #3b82f6, #8b5cf6);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	margin-right: 16px;
	box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}
.user-card .user-info .name {
	font-size: 16px;
	font-weight: bold;
	color: var(--text-main);
	margin-bottom: 4px;
}
.user-card .user-info .role {
	font-size: 12px;
	color: var(--text-muted);
}

/* 2. 设置列表组 */
.settings-group {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.setting-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 14px 16px;
	background-color: var(--bg-card-inner);
	border-radius: 12px;
	border: 1px solid var(--border-color);
	transition: border-color 0.2s;
}
.setting-item:hover {
	border-color: #3b82f650;
}
.setting-item .label {
	color: var(--text-main);
	font-size: 14px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 10px;
}
.setting-item .label i {
	font-size: 16px;
	width: 20px;
	text-align: center;
}

/* 辅助说明文字 */
.notice-type {
	font-size: 11px;
	color: var(--text-muted);
}

/* 独立配置按钮样式 */
.premium-config-btn {
	width: 100%;
	background-color: transparent;
	border: 1px dashed #3b82f6;
	color: #3b82f6;
	padding: 8px 12px;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.premium-config-btn:hover {
	background-color: #3b82f6;
	color: #ffffff;
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* AI 专属绿色主题配置按钮 */
.premium-config-btn.ai-config-btn {
	border-color: #10b981;
	color: #10b981;
}
.premium-config-btn.ai-config-btn:hover {
	background-color: #10b981;
	color: #ffffff;
	box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

/* 3. 底部退出按钮 */
.premium-logout-btn {
	width: 100%;
	padding: 12px;
	border-radius: 12px;
	border: none;
	font-size: 15px;
	font-weight: bold;
	cursor: pointer;
	background-color: rgba(239, 68, 68, 0.1);
	color: #ef4444;
	transition: all 0.3s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}
.premium-logout-btn:hover {
	background-color: #ef4444;
	color: #ffffff;
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* ================== 表单样式 ================== */
.feishu-form-body {
	display: flex;
	flex-direction: column;
	gap: 16px;
}
.form-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	text-align: left;
}
.form-label {
	color: var(--text-main);
	font-size: 13px;
	font-weight: bold;
}
.form-label .required {
	color: #ef4444;
	margin-left: 4px;
}
.premium-input {
	width: 100%;
	background-color: var(--bg-route-page);
	border: 1px solid var(--border-color);
	color: var(--text-main);
	padding: 12px 14px;
	border-radius: 10px;
	outline: none;
	transition: all 0.2s;
	box-sizing: border-box;
	font-size: 13px;
}
.premium-input:focus {
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.form-tips {
	background-color: rgba(59, 130, 246, 0.08);
	color: #3b82f6;
	padding: 10px 12px;
	border-radius: 8px;
	font-size: 12px;
	line-height: 1.4;
	display: flex;
	gap: 6px;
}

/* 底部双按钮排版 */
.flex-footer {
	display: flex;
	gap: 12px;
}
.premium-btn {
	flex: 1;
	padding: 12px;
	border-radius: 12px;
	border: none;
	font-size: 14px;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.3s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.premium-btn.default {
	background-color: var(--bg-card-inner);
	color: var(--text-main);
	border: 1px solid var(--border-color);
}
.premium-btn.default:hover {
	background-color: var(--border-color);
}
.premium-btn.primary {
	background-color: #3b82f6;
	color: #ffffff;
}
.premium-btn.primary:hover {
	background-color: #2563eb;
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>

<style scoped>
/* ========== 布局容器 ========== */
.layout-container {
	display: flex;
	width: 100vw;
	height: 100vh;
}

/* ========== 左侧侧边栏 (独立深色，保持高级感) ========== */
.left-sidebar {
	width: 240px;
	background-color: #111827;
	color: #e5e7eb;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	border-right: 1px solid #1f2937;
	overflow: hidden;
	z-index: 1000;
}

.left-sidebar.collapsed {
	width: 64px;
}

.sidebar-header {
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 16px;
	background-color: #111827;
	border-bottom: 1px solid #1f2937;
	white-space: nowrap;
}

.collapsed .sidebar-header {
	padding: 0;
	justify-content: center;
}

.app-title {
	font-size: 1.2rem;
	font-weight: 700;
	color: #3b82f6;
	letter-spacing: 1px;
}

.toggle-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: 8px;
	color: #9ca3af;
	transition: all 0.2s;
}

.toggle-btn:hover {
	background-color: #1f2937;
	color: #ffffff;
}

/* ========== 菜单列表区域 ========== */
.nav-menu {
	padding: 12px 0;
	flex: 1;
	display: flex;
	flex-direction: column;
}

.nav-item {
	height: 50px;
	margin: 4px 8px;
	display: flex;
	align-items: center;
	padding: 0 12px;
	cursor: pointer;
	color: #9ca3af;
	border-radius: 8px;
	transition: all 0.3s;
	white-space: nowrap;
	position: relative;
}

.nav-item:hover {
	background-color: rgba(255, 255, 255, 0.05);
	color: #ffffff;
}

.nav-item.active {
	background-color: #3b82f6;
	color: #ffffff;
}

.icon-box {
	min-width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	transition: margin 0.3s;
}

.nav-item .icon-box {
	margin-right: 12px;
}

.nav-text {
	font-size: 14px;
	font-weight: 500;
	opacity: 1;
	transition: opacity 0.2s;
}

.collapsed .nav-item {
	margin: 4px 10px;
	padding: 0;
	justify-content: center;
}

.collapsed .icon-box {
	margin-right: 0;
}

/* ========== 底部设置按钮 ========== */
.nav-bottom {
	margin-top: auto;
	width: 100%;
	padding: 8px 0;
	position: relative;
}

/* ========== 右侧内容区 (应用全局CSS变量) ========== */
.right-content {
	flex: 1;
	background-color: var(--bg-route-page);
	overflow: hidden;
	display: flex;
	flex-direction: column;
	transition: background-color 0.3s;
}

.page-viewport {
	flex: 1;
	width: 100%;
	overflow-y: auto;
	padding: 20px;
	box-sizing: border-box;
}
</style>