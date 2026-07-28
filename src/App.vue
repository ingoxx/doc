<template>
	<div id="app">
		<!-- 1. 控制总开关：如果有授权 token/sign，渲染主页面/文档库内容 -->
		<router-view v-if="isAuth" />

		<!-- 2. 全局文档终端登录 & 重置密码验证层 (毛玻璃暗黑科技风) -->
		<transition name="auth-fade">
			<div v-if="dialogVisible" class="auth-fullscreen-overlay">
				<!-- 背景网格与高感光晕 -->
				<div class="bg-grid-pattern"></div>
				<div class="glow-orb orb-blue"></div>
				<div class="glow-orb orb-purple"></div>

				<!-- ================= 核心登录卡片 ================= -->
				<div v-if="!isForgotMode" class="auth-card" :class="{ 'shake-anim': isErrorShake }">
					
					<!-- 顶部安全防护徽章 (已居中) -->
					<div class="security-badge-wrapper">
						<div class="security-badge">
							<i class="el-icon-shield"></i>
							<span>DOCUMENT VAULT ACCESS</span>
						</div>
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

					<!-- 底部提交与操作链接区 -->
					<div class="card-footer">
						<el-button 
							class="unlock-btn" 
							:loading="secret_loading" 
							@click="handleLogin" 
							tabindex="0">
							<span>{{ secret_loading ? '身份校验中...' : '安全登录并接入' }}</span>
							<i v-if="!secret_loading" class="el-icon-right arrow-icon"></i>
						</el-button>

						<!-- 链接入口区 -->
						<div class="action-links">
							<el-button type="text" class="forgot-btn" @click="goForgot">
								<i class="el-icon-warning-outline"></i> 忘记密码？
							</el-button>
							<span class="link-divider">|</span>
							<div class="register-group">
								<span class="tip-text">还没有账号？</span>
								<el-button type="text" class="register-btn" @click="goRegister">
									<i class="el-icon-user-solid"></i> 立即注册
								</el-button>
							</div>
						</div>

						<div class="footer-tips">
							<i class="el-icon-info"></i> 支持 Enter 键快速登录
						</div>
					</div>
				</div>

				<!-- ================= 忘记密码 / 重置密码卡片 ================= -->
				<div v-else class="auth-card reset-card" :class="{ 'shake-anim': isErrorShake }">
					
					<!-- 顶部安全防护徽章 (已居中) -->
					<div class="security-badge-wrapper">
						<div class="security-badge warning-badge">
							<i class="el-icon-refresh-right"></i>
							<span>PASSWORD RESET TERMINAL</span>
						</div>
					</div>

					<!-- 卡片头部标题区 -->
					<div class="card-header">
						<div class="lock-icon-box cyan-box">
							<i class="el-icon-key"></i>
							<div class="icon-pulse cyan-pulse"></div>
						</div>
						<h2 class="title">重置账户密码</h2>
						<p class="subtitle">验证您的身份账号并设定全新的登录密码</p>
					</div>

					<!-- 表单输入框区 -->
					<div class="card-body">
						<el-form :model="resetForm" :rules="resetRules" ref="resetForm" @submit.native.prevent="handleUpdatePassword">
							<!-- 用户名 -->
							<el-form-item prop="username">
								<el-input 
									ref="resetUsernameInput"
									v-model="resetForm.username" 
									placeholder="请输入绑定的用户名 / 账号" 
									clearable 
									prefix-icon="el-icon-user"
									@keyup.enter.native="focusNewPassword">
								</el-input>
							</el-form-item>

							<!-- 新密码 -->
							<el-form-item prop="new_password">
								<el-input 
									ref="newPasswordInput"
									v-model="resetForm.new_password" 
									type="password" 
									placeholder="设置新密码 (不少于6位)" 
									clearable 
									show-password 
									prefix-icon="el-icon-lock"
									@keyup.enter.native="focusConfirmPassword">
								</el-input>
							</el-form-item>

							<!-- 再次确认新密码 -->
							<el-form-item prop="confirm_password">
								<el-input 
									ref="confirmPasswordInput"
									v-model="resetForm.confirm_password" 
									type="password" 
									placeholder="再次确认新密码" 
									clearable 
									show-password 
									prefix-icon="el-icon-circle-check"
									@keyup.enter.native="handleUpdatePassword">
								</el-input>
							</el-form-item>
						</el-form>
					</div>

					<!-- 底部提交与返回区 -->
					<div class="card-footer">
						<el-button 
							class="unlock-btn reset-submit-btn" 
							:loading="secret_loading" 
							@click="handleUpdatePassword" 
							tabindex="0">
							<span>{{ secret_loading ? '提交更新中...' : '确认修改并保存' }}</span>
							<i v-if="!secret_loading" class="el-icon-check arrow-icon"></i>
						</el-button>

						<div class="action-links center-links">
							<el-button type="text" class="back-login-btn" @click="goLogin">
								<i class="el-icon-back"></i> 记起密码了？返回登录
							</el-button>
						</div>
					</div>
				</div>

			</div>
		</transition>
	</div>
</template>

<script>
import { Message } from 'element-ui';
import { login_auth, update_password } from '@/api';

export default {
	name: 'App',
	data() {
		const validateConfirmPassword = (rule, value, callback) => {
			if (!value) {
				callback(new Error('请再次输入新密码'));
			} else if (value !== this.resetForm.new_password) {
				callback(new Error('两次输入的密码不一致，请重新确认'));
			} else {
				callback();
			}
		};

		return {
			isAuth: false,
			dialogVisible: false,
			isForgotMode: false,
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
			},

			resetForm: {
				username: '',
				new_password: '',
				confirm_password: ''
			},
			resetRules: {
				username: [
					{ required: true, message: '请输入绑定的用户名', trigger: 'blur' }
				],
				new_password: [
					{ required: true, message: '请输入新密码', trigger: 'blur' },
					{ min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
				],
				confirm_password: [
					{ required: true, validator: validateConfirmPassword, trigger: 'blur' }
				]
			}
		};
	},
	created() {
		this.checkSign();
	},
	watch: {
		$route() {
			this.checkSign();
		},
		dialogVisible(val) {
			if (val) {
				if (this.isForgotMode) {
					this.focusResetUsername();
				} else {
					this.focusUsername();
				}
			}
		}
	},
	mounted() {
		if (this.dialogVisible) {
			if (this.isForgotMode) {
				this.focusResetUsername();
			} else {
				this.focusUsername();
			}
		}
	},
	methods: {
		focusUsername() {
			this.$nextTick(() => {
				if (this.$refs.usernameInput) {
					this.$refs.usernameInput.focus();
				}
			});
		},

		focusPassword() {
			if (this.$refs.passwordInput) {
				this.$refs.passwordInput.focus();
			}
		},

		focusResetUsername() {
			this.$nextTick(() => {
				if (this.$refs.resetUsernameInput) {
					this.$refs.resetUsernameInput.focus();
				}
			});
		},

		focusNewPassword() {
			if (this.$refs.newPasswordInput) {
				this.$refs.newPasswordInput.focus();
			}
		},

		focusConfirmPassword() {
			if (this.$refs.confirmPasswordInput) {
				this.$refs.confirmPasswordInput.focus();
			}
		},

		checkSign() {
			const path = this.$route ? this.$route.path : '';

			if (path === '/register') {
				this.isAuth = true;
				this.dialogVisible = false;
				this.isForgotMode = false;
				return;
			}

			if (path === '/update-password') {
				this.isAuth = false;
				this.dialogVisible = true;
				this.isForgotMode = true;
				return;
			}

			const sign = localStorage.getItem('sign') || localStorage.getItem('token');
			if (sign) {
				this.isAuth = true;
				this.dialogVisible = false;
				this.isForgotMode = false;
			} else {
				this.isAuth = false;
				this.dialogVisible = true;
				this.isForgotMode = false;
			}
		},

		triggerShake() {
			this.isErrorShake = true;
			setTimeout(() => {
				this.isErrorShake = false;
			}, 600);
		},

		goForgot() {
			this.isForgotMode = true;
			this.loginForm.password = '';
			if (this.$router && this.$route.path !== '/update-password') {
				this.$router.push('/update-password');
			}
			this.focusResetUsername();
		},

		goLogin() {
			this.isForgotMode = false;
			if (this.$router && this.$route.path !== '/') {
				this.$router.push('/');
			}
			this.focusUsername();
		},

		goRegister() {
			this.dialogVisible = false;
			if (this.$router && this.$route.path !== '/register') {
				this.$router.push('/register');
			}
		},

		async handleLogin() {
			let sign = localStorage.getItem('sign') || localStorage.getItem('token');

			if (!sign) {
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
						this.loginForm.password = '';
						return;
					}
				} catch (error) {
					Message.error({ message: error.message || "网络请求异常，请稍后重试", center: true });
					this.secret_loading = false;
					this.triggerShake();
					return;
				}
			}

			this.isAuth = true;
			this.secret_loading = false;
			this.dialogVisible = false;
		},

		async handleUpdatePassword() {
			let isValid = false;
			this.$refs.resetForm.validate((valid) => {
				isValid = valid;
			});

			if (!isValid) {
				this.triggerShake();
				return;
			}

			this.secret_loading = true;
			try {
				const payload = {
					username: this.resetForm.username.trim(),
					new_password: this.resetForm.new_password.trim()
				};

				const response = await update_password(payload);
				const resData = response && response.data ? response.data : response;

				if (resData && (resData.code == 1000 || resData.code == 200 || resData.status === 'success')) {
					Message.success({ message: resData.msg || "密码修改成功，请使用新密码登录", center: true });
					this.secret_loading = false;
					
					this.resetForm = { username: '', new_password: '', confirm_password: '' };
					this.goLogin();
				} else {
					Message.error({ message: (resData && resData.msg) || "密码重置失败，请检查账号", center: true });
					this.secret_loading = false;
					this.triggerShake();
				}
			} catch (error) {
				Message.error({ message: error.message || "网络请求异常，请稍后重试", center: true });
				this.secret_loading = false;
				this.triggerShake();
			}
		}
	}
};
</script>

<style lang="scss">
/* ====== 全局基础样式 ====== */
html,
body {
	margin: 0;
	padding: 0;
	height: 100%;
	width: 100%;
	box-sizing: border-box;
	background-color: #090d16;
}

#app {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	height: 100%;
	width: 100%;
}

/* ====== 全屏加密防护终端层 ====== */
.auth-fullscreen-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	background-color: #090d16;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1999;
	overflow: hidden;
	padding: 20px; /* 基础边距，确保小屏下内容不会贴边 */

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
		width: 100%;
		max-width: 410px;
		margin: 0 auto; /* 强制水平居中 */
		box-sizing: border-box;
		background: rgba(18, 24, 38, 0.75);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 34px 30px 26px;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
		transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

		&:hover {
			border-color: rgba(14, 165, 233, 0.3);
			box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.1);
		}

		/* 顶部安全徽章居中容器 */
		.security-badge-wrapper {
			display: flex;
			justify-content: center;
			margin-bottom: 20px;
		}

		.security-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			padding: 4px 12px;
			background: rgba(14, 165, 233, 0.1);
			border: 1px solid rgba(14, 165, 233, 0.25);
			border-radius: 20px;
			color: #38bdf8;
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 1px;

			i {
				font-size: 13px;
			}

			&.warning-badge {
				background: rgba(245, 158, 11, 0.1);
				border-color: rgba(245, 158, 11, 0.3);
				color: #fbbf24;
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

				&.cyan-box {
					background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2));
					border-color: rgba(45, 212, 191, 0.4);
					color: #2dd4bf;

					.cyan-pulse {
						border-color: #2dd4bf;
					}
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

				&.reset-submit-btn {
					background: linear-gradient(135deg, #0d9488, #0284c7) !important;
					box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);

					&:hover {
						box-shadow: 0 8px 24px rgba(13, 148, 136, 0.45);
					}
				}
			}

			.action-links {
				margin-top: 16px;
				display: flex;
				align-items: center;
				justify-content: space-between;
				font-size: 13px;

				&.center-links {
					justify-content: center;
				}

				.forgot-btn {
					color: #94a3b8 !important;
					padding: 0 !important;
					font-size: 13px;

					&:hover {
						color: #f59e0b !important;
					}
				}

				.link-divider {
					color: #334155;
					margin: 0 6px;
				}

				.register-group {
					display: inline-flex;
					align-items: center;
				}

				.tip-text {
					color: #64748b;
				}

				.register-btn {
					color: #38bdf8 !important;
					font-weight: 600;
					padding: 0 2px !important;
					font-size: 13px;

					&:hover {
						color: #7dd3fc !important;
						text-decoration: underline;
					}
				}

				.back-login-btn {
					color: #38bdf8 !important;
					font-size: 13px;
					font-weight: 600;

					i {
						margin-right: 4px;
					}

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

/* =========================================================
   移动端 (Mobile) 响应式适配样式
   ========================================================= */
@media (max-width: 768px) {
	.auth-fullscreen-overlay {
		padding: 16px; /* 左右保留精准 16px 边距 */

		.glow-orb {
			width: 240px;
			height: 240px;
			filter: blur(80px);

			&.orb-blue {
				top: -5%;
				left: -10%;
			}

			&.orb-purple {
				bottom: -5%;
				right: -10%;
			}
		}

		.auth-card {
			width: 100%;
			max-width: 360px; /* 针对移动端优化最大宽度 */
			margin: 0 auto;  /* 严格居中 */
			padding: 26px 20px 22px; /* 左右 padding 设置为对称 20px */
			border-radius: 16px;

			.security-badge-wrapper {
				margin-bottom: 14px;
			}

			.security-badge {
				font-size: 10px;
				padding: 3px 10px;
			}

			.card-header {
				margin-bottom: 18px;

				.lock-icon-box {
					width: 48px;
					height: 48px;
					font-size: 20px;
					border-radius: 14px;
					margin: 0 auto 12px;

					.icon-pulse {
						border-radius: 14px;
					}
				}

				.title {
					font-size: 18px;
				}

				.subtitle {
					font-size: 12px;
				}
			}

			.card-body {
				.el-form-item {
					margin-bottom: 14px;
				}

				::v-deep .el-input__inner {
					height: 44px;
					line-height: 44px;
					font-size: 13px;
					padding-left: 38px !important;
				}

				::v-deep .el-input__prefix {
					left: 12px;
					i {
						line-height: 44px;
						font-size: 15px;
					}
				}

				::v-deep .el-input__suffix {
					right: 10px;
					i {
						line-height: 44px;
						font-size: 15px;
					}
				}
			}

			.card-footer {
				.unlock-btn {
					height: 44px;
					font-size: 14px;
					border-radius: 10px;
				}

				.action-links {
					margin-top: 14px;
					font-size: 12px;
					display: flex;
					justify-content: space-between; /* 对齐左右两端 */
					align-items: center;

					.forgot-btn,
					.register-btn,
					.back-login-btn {
						font-size: 12px;
					}

					.link-divider {
						margin: 0 4px;
					}
				}

				.footer-tips {
					margin-top: 12px;
					font-size: 11px;
				}
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