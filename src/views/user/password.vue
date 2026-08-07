<template>
	<div class="auth-fullscreen-overlay">
		<!-- 背景网格与高感光晕 -->
		<div class="bg-grid-pattern"></div>
		<div class="glow-orb orb-blue"></div>
		<div class="glow-orb orb-purple"></div>

		<!-- ================= 重置密码卡片 ================= -->
		<div class="auth-card reset-card" :class="{ 'shake-anim': isErrorShake }">
			
			<!-- 顶部安全防护徽章 -->
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
				<el-form 
					:model="resetForm" 
					:rules="resetRules" 
					ref="resetForm" 
					@submit.native.prevent="handleUpdatePassword">
					
					<!-- 用户名 -->
					<el-form-item prop="username">
						<el-input 
							ref="resetUsernameInput"
							v-model="resetForm.username" 
							placeholder="请输入绑定的用户名 / 账号" 
							clearable 
							prefix-icon="el-icon-user"
							@keyup.enter.native="focusSecretCode">
						</el-input>
					</el-form-item>

					<!-- 安全口令 (新增) -->
					<el-form-item prop="secret_code">
						<el-input 
							ref="secretCodeInput"
							v-model="resetForm.secret_code" 
							placeholder="请输入安全验证口令" 
							clearable 
							prefix-icon="el-icon-key"
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
</template>

<script>
import { Message } from 'element-ui';
import { update_password } from '@/api';

export default {
	name: 'UpdatePassword',
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
			secret_loading: false,
			isErrorShake: false,

			resetForm: {
				username: '',
				secret_code: '', // 新增字段
				new_password: '',
				confirm_password: ''
			},
			resetRules: {
				username: [
					{ required: true, message: '请输入绑定的用户名', trigger: 'blur' }
				],
				secret_code: [
					{ required: true, message: '请输入安全验证口令', trigger: 'blur' } // 新增口令必填校验
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
	mounted() {
		this.focusResetUsername();
	},
	methods: {
		focusResetUsername() {
			this.$nextTick(() => {
				if (this.$refs.resetUsernameInput) {
					this.$refs.resetUsernameInput.focus();
				}
			});
		},

		focusSecretCode() {
			if (this.$refs.secretCodeInput) {
				this.$refs.secretCodeInput.focus();
			}
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

		triggerShake() {
			this.isErrorShake = true;
			setTimeout(() => {
				this.isErrorShake = false;
			}, 600);
		},

		// 安全跳转登录页，防 Uncaught (in promise)
		goLogin() {
			const targetPath = '/'; // 如果你的登录页路径是 /login，可改为 '/login'

			if (this.$router && this.$route.path !== targetPath) {
				this.$router.push(targetPath).catch(err => {
					// 忽略路由守卫重定向或重复导航引发的 Promise 异常
					if (
						err && 
						(err.name === 'NavigationDuplicated' || 
						 (err.message && err.message.includes('Redirected')))
					) {
						return;
					}
					console.error(err);
				});
			}
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
				// 新增 secret_code 随 payload 一同提交
				const payload = {
					username: this.resetForm.username.trim(),
					secret_code: this.resetForm.secret_code.trim(),
					new_password: this.resetForm.new_password.trim()
				};

				const response = await update_password(payload);
				const resData = response && response.data ? response.data : response;

				if (resData && (resData.code == 1000 || resData.code == 200 || resData.status === 'success')) {
					Message.success({ message: resData.msg || "密码修改成功，请使用新密码登录", center: true });
					this.secret_loading = false;
					
					// 重置表单状态
					this.resetForm = { username: '', secret_code: '', new_password: '', confirm_password: '' };
					// 成功后进行安全跳转
					this.goLogin();
				} else {
					Message.error({ message: (resData && resData.msg) || "密码重置失败，请检查账号和口令", center: true });
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

<style lang="scss" scoped>
/* 全屏暗黑科技风容器 */
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
	padding: 20px;

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
		margin: 0 auto;
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
			background: rgba(245, 158, 11, 0.1);
			border: 1px solid rgba(245, 158, 11, 0.3);
			border-radius: 20px;
			color: #fbbf24;
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 1px;

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
				background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2));
				border: 1px solid rgba(45, 212, 191, 0.4);
				border-radius: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #2dd4bf;
				font-size: 26px;

				.cyan-pulse {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 18px;
					border: 1px solid #2dd4bf;
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
				background: linear-gradient(135deg, #0d9488, #0284c7) !important;
				border: none !important;
				color: #ffffff !important;
				font-size: 15px;
				font-weight: 600;
				border-radius: 10px;
				box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
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
					box-shadow: 0 8px 24px rgba(13, 148, 136, 0.45);

					.arrow-icon {
						transform: translateX(4px);
					}
				}
			}

			.action-links {
				margin-top: 16px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 13px;

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
		}
	}
}

/* 移动端响应式 */
@media (max-width: 768px) {
	.auth-fullscreen-overlay {
		padding: 16px;

		.glow-orb {
			width: 240px;
			height: 240px;
			filter: blur(80px);
		}

		.auth-card {
			max-width: 360px;
			padding: 26px 20px 22px;
			border-radius: 16px;

			.card-header {
				margin-bottom: 18px;

				.lock-icon-box {
					width: 48px;
					height: 48px;
					font-size: 20px;
				}

				.title { font-size: 18px; }
				.subtitle { font-size: 12px; }
			}

			.card-body {
				.el-form-item { margin-bottom: 14px; }

				::v-deep .el-input__inner {
					height: 44px;
					line-height: 44px;
					font-size: 13px;
					padding-left: 38px !important;
				}
			}

			.card-footer {
				.unlock-btn {
					height: 44px;
					font-size: 14px;
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
</style>