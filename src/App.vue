<template>
	<div id="app">
		<!-- 1. 控制总开关：如果有授权 token/sign，渲染主页面/文档库内容 -->
		<router-view v-if="isAuth" />

		<!-- 2. 全局文档终端登录验证层 (毛玻璃暗黑科技风) -->
		<transition name="auth-fade">
			<div v-if="dialogVisible" class="auth-fullscreen-overlay">
				<!-- 背景网格与高感光晕 -->
				<div class="bg-grid-pattern"></div>
				<div class="glow-orb orb-blue"></div>
				<div class="glow-orb orb-purple"></div>

				<!-- 核心验证卡片 (支持错误抖动动画) -->
				<div class="auth-card" :class="{ 'shake-anim': isErrorShake }">
					
					<!-- 顶部安全防护徽章 -->
					<div class="security-badge">
						<i class="el-icon-shield"></i>
						<span>DOCUMENT VAULT ACCESS</span>
					</div>

					<!-- 卡片头部标题区 -->
					<div class="card-header">
						<div class="lock-icon-box">
							<i class="el-icon-lock"></i>
							<div class="icon-pulse"></div>
						</div>
						<h2 class="title">{{ secret_dia_title }}</h2>
						<p class="subtitle">受保护的故障知识库，请输入凭载登录</p>
					</div>

					<!-- 表单输入框区 -->
					<div class="card-body">
						<el-form :model="loginForm" :rules="loginRules" ref="loginForm" @submit.native.prevent="handleLogin">
							<!-- 用户名 -->
							<el-form-item prop="username">
								<el-input 
									ref="usernameInput"
									v-model="loginForm.username" 
									placeholder="请输入用户名 / 账号" 
									clearable 
									prefix-icon="el-icon-user"
									@keyup.enter.native="focusPassword">
								</el-input>
							</el-form-item>

							<!-- 密码 -->
							<el-form-item prop="password">
								<el-input 
									ref="passwordInput"
									v-model="loginForm.password" 
									type="password" 
									placeholder="请输入登录密码" 
									clearable 
									show-password 
									prefix-icon="el-icon-key"
									@keyup.enter.native="handleLogin">
								</el-input>
							</el-form-item>
						</el-form>
					</div>

					<!-- 底部提交与注册操作区 -->
					<div class="card-footer">
						<el-button 
							class="unlock-btn" 
							:loading="secret_loading" 
							@click="handleLogin" 
							tabindex="0">
							<span>{{ secret_loading ? '身份校验中...' : '安全登录并接入' }}</span>
							<i v-if="!secret_loading" class="el-icon-right arrow-icon"></i>
						</el-button>

						<!-- 新增注册入口按钮区 -->
						<div class="action-links">
							<span class="tip-text">还没有账号？</span>
							<el-button type="text" class="register-btn" @click="goRegister">
								<i class="el-icon-user-solid"></i> 立即注册新账号
							</el-button>
						</div>

						<div class="footer-tips">
							<i class="el-icon-info"></i> 支持 Enter 键快速登录
						</div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script>
import { Message } from 'element-ui';
import { login_auth } from '@/api';

export default {
	name: 'App',
	data() {
		return {
			isAuth: false,
			dialogVisible: false,
			secret_dia_title: 'TroubleDocs 故障文档库',
			secret_loading: false,
			isErrorShake: false,
			loginForm: {
				username: '',
				password: ''
			},
			loginRules: {
				username: [
					{ required: true, message: '请输入用户名', trigger: 'blur' }
				],
				password: [
					{ required: true, message: '请输入密码', trigger: 'blur' }
				]
			}
		};
	},
	created() {
		this.checkSign();
	},
	mounted() {
		if (this.dialogVisible) {
			this.focusUsername();
		}
	},
	watch: {
		$route() {
			this.checkSign();
		},
		dialogVisible(val) {
			if (val) {
				this.focusUsername();
			}
		}
	},
	methods: {
		// 自动聚焦用户名框
		focusUsername() {
			this.$nextTick(() => {
				if (this.$refs.usernameInput) {
					this.$refs.usernameInput.focus();
				}
			});
		},

		// 聚焦密码框
		focusPassword() {
			if (this.$refs.passwordInput) {
				this.$refs.passwordInput.focus();
			}
		},

		// 检查本地登录 Token/Sign 状态
		checkSign() {
			// 如果当前处于注册路由页面，不弹窗拦截
			if (this.$route && this.$route.path === '/register') {
				this.isAuth = true;
				this.dialogVisible = false;
				return;
			}

			const sign = localStorage.getItem('sign') || localStorage.getItem('token');
			if (sign) {
				this.isAuth = true;
				this.dialogVisible = false;
			} else {
				this.isAuth = false;
				this.dialogVisible = true;
			}
		},

		// 触发卡片错误抖动
		triggerShake() {
			this.isErrorShake = true;
			setTimeout(() => {
				this.isErrorShake = false;
			}, 600);
		},

		// 跳转/触发注册页面
		goRegister() {
			this.dialogVisible = false;
			// 配合 Vue Router 跳转到 /register 注册页
			if (this.$router && this.$route.path !== '/register') {
				this.$router.push('/register');
			}
		},

		// 登录校验主逻辑
		async handleLogin() {
			let sign = localStorage.getItem('sign') || localStorage.getItem('token');

			if (!sign) {
				// 表单校验
				let isValid = false;
				this.$refs.loginForm.validate((valid) => {
					isValid = valid;
				});

				if (!isValid) {
					this.triggerShake();
					return;
				}

				this.secret_loading = true;
				try {
					const payload = {
						username: this.loginForm.username.trim(),
						password: this.loginForm.password.trim()
					};
					const response = await login_auth(payload);
					const resData = response && response.data ? response.data : response;

					if (resData && (resData.code == 1000 || resData.token)) {
						const tokenVal = resData.token || resData.data?.token || 'AUTH_TOKEN_SUCCESS';
						const uid = resData.uid || resData.data?.uid || 'AUTH_TOKEN_SUCCESS';
						localStorage.setItem('sign', tokenVal);
						localStorage.setItem('username', this.loginForm.username.trim());
						localStorage.setItem('uid', uid);
						Message.success({ message: resData.msg || "登录成功，欢迎使用文档库", center: true });
					} else {
						Message.error({ message: (resData && resData.msg) || "用户名或密码错误", center: true });
						this.secret_loading = false;
						this.triggerShake();
						this.loginForm.password = ''; // 校验失败清空密码
						return;
					}
				} catch (error) {
					Message.error({ message: error.message || "网络请求异常，请稍后重试", center: true });
					this.secret_loading = false;
					this.triggerShake();
					return;
				}
			}

			// 授权通过
			this.isAuth = true;
			this.secret_loading = false;
			this.dialogVisible = false;
		}
	}
};
</script>

<style lang="scss">
/* ====== 全局基础全局样式 ====== */
html,
body {
	margin: 0;
	padding: 0;
	height: 100%;
	box-sizing: border-box;
	background-color: #090d16; /* 深邃暗夜蓝黑背景 */
}

#app {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	height: 100%;
}

/* ====== 全屏加密防护终端层 ====== */
.auth-fullscreen-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: #090d16;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1999;
	overflow: hidden;

	.bg-grid-pattern {
		position: absolute;
		width: 100%;
		height: 100%;
		background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
		background-size: 32px 32px;
		z-index: 1;
		pointer-events: none;
	}

	.glow-orb {
		position: absolute;
		width: 500px;
		height: 500px;
		border-radius: 50%;
		filter: blur(160px);
		z-index: 1;
		pointer-events: none;

		&.orb-blue {
			top: -10%;
			left: 20%;
			background: rgba(14, 165, 233, 0.18);
		}

		&.orb-purple {
			bottom: -10%;
			right: 20%;
			background: rgba(99, 102, 241, 0.18);
		}
	}

	.auth-card {
		position: relative;
		z-index: 10;
		width: 410px;
		background: rgba(18, 24, 38, 0.75);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 38px 36px 28px;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
		transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

		&:hover {
			border-color: rgba(14, 165, 233, 0.3);
			box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.1);
		}

		.security-badge {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 4px 12px;
			background: rgba(14, 165, 233, 0.1);
			border: 1px solid rgba(14, 165, 233, 0.25);
			border-radius: 20px;
			color: #38bdf8;
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 1px;
			margin-bottom: 20px;

			i {
				font-size: 13px;
			}
		}

		.card-header {
			text-align: center;
			margin-bottom: 24px;

			.lock-icon-box {
				position: relative;
				width: 60px;
				height: 60px;
				margin: 0 auto 16px;
				background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2));
				border: 1px solid rgba(56, 189, 248, 0.3);
				border-radius: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #38bdf8;
				font-size: 26px;

				.icon-pulse {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 18px;
					border: 1px solid #38bdf8;
					opacity: 0;
					animation: pulse-ring 2.5s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
				}
			}

			.title {
				margin: 0;
				color: #f8fafc;
				font-size: 22px;
				font-weight: 700;
			}

			.subtitle {
				margin: 6px 0 0;
				color: #94a3b8;
				font-size: 13px;
			}
		}

		.card-body {
			margin-bottom: 8px;

			.el-form-item {
				margin-bottom: 18px;
			}

			::v-deep .el-input__inner {
				background-color: rgba(10, 15, 26, 0.8) !important;
				border: 1px solid #27272a !important;
				color: #f8fafc !important;
				height: 48px;
				line-height: 48px;
				font-size: 14px;
				border-radius: 10px;
				padding-left: 42px !important;
				transition: all 0.3s ease;

				&:focus {
					border-color: #38bdf8 !important;
					box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18) !important;
				}

				&::placeholder {
					color: #64748b;
				}
			}

			::v-deep .el-input__prefix {
				left: 14px;
				color: #64748b;

				i {
					line-height: 48px;
					font-size: 17px;
				}
			}

			::v-deep .el-input__suffix {
				right: 12px;

				i {
					line-height: 48px;
					font-size: 16px;
					color: #64748b;

					&:hover {
						color: #38bdf8;
					}
				}
			}
		}

		.card-footer {
			.unlock-btn {
				width: 100%;
				height: 48px;
				background: linear-gradient(135deg, #0ea5e9, #6366f1) !important;
				border: none !important;
				color: #ffffff !important;
				font-size: 15px;
				font-weight: 600;
				border-radius: 10px;
				box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
				transition: all 0.3s ease;
				display: flex;
				justify-content: center;
				align-items: center;

				.arrow-icon {
					margin-left: 8px;
					font-size: 16px;
					transition: transform 0.2s ease;
				}

				&:hover {
					transform: translateY(-1px);
					box-shadow: 0 8px 24px rgba(14, 165, 233, 0.45);

					.arrow-icon {
						transform: translateX(4px);
					}
				}
			}

			/* 注册按钮栏 */
			.action-links {
				margin-top: 16px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 13px;

				.tip-text {
					color: #64748b;
				}

				.register-btn {
					color: #38bdf8 !important;
					font-weight: 600;
					padding: 0 4px !important;
					font-size: 13px;

					&:hover {
						color: #7dd3fc !important;
						text-decoration: underline;
					}
				}
			}

			.footer-tips {
				margin-top: 14px;
				text-align: center;
				color: #475569;
				font-size: 12px;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 4px;
			}
		}
	}
}

@keyframes pulse-ring {
	0% { transform: scale(0.95); opacity: 0.8; }
	50% { transform: scale(1.15); opacity: 0; }
	100% { transform: scale(0.95); opacity: 0; }
}

.shake-anim {
	animation: card-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes card-shake {
	10%, 90% { transform: translate3d(-1px, 0, 0); }
	20%, 80% { transform: translate3d(2px, 0, 0); }
	30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
	40%, 60% { transform: translate3d(4px, 0, 0); }
}

.auth-fade-enter-active,
.auth-fade-leave-active {
	transition: opacity 0.4s ease, transform 0.4s ease;
}

.auth-fade-enter,
.auth-fade-leave-to {
	opacity: 0;
	transform: scale(0.98);
}
</style>