<template>
	<div class="register-container">
		<!-- 背景科技高感光晕与网格 -->
		<div class="bg-grid-pattern"></div>
		<div class="glow-orb orb-emerald"></div>
		<div class="glow-orb orb-cyan"></div>

		<!-- 注册核心卡片 -->
		<div class="register-card" :class="{ 'shake-anim': isErrorShake }">
			
			<!-- 顶部安全徽章 -->
			<div class="security-badge">
				<i class="el-icon-circle-plus-outline"></i>
				<span>CREATE YOUR ACCOUNT</span>
			</div>

			<!-- 头部标题区 -->
			<div class="card-header">
				<div class="user-icon-box">
					<i class="el-icon-user-solid"></i>
					<div class="icon-pulse"></div>
				</div>
				<h2 class="title">注册 TroubleDocs 账号</h2>
				<p class="subtitle">创建您的凭据以解锁全量故障排错知识库</p>
			</div>

			<!-- 注册表单区域 -->
			<div class="card-body">
				<el-form :model="registerForm" :rules="registerRules" ref="registerForm" label-position="top">
					
					<!-- 用户名 -->
					<el-form-item prop="username">
						<el-input 
							v-model="registerForm.username" 
							placeholder="设置用户名 (至少3个字符)" 
							clearable 
							prefix-icon="el-icon-user">
						</el-input>
					</el-form-item>

					<!-- 设置密码 -->
					<el-form-item prop="password">
						<el-input 
							v-model="registerForm.password" 
							type="password" 
							placeholder="设置登录密码 (至少6位)" 
							clearable 
							show-password 
							prefix-icon="el-icon-lock">
						</el-input>
					</el-form-item>

					<!-- 确认密码 -->
					<el-form-item prop="confirmPassword">
						<el-input 
							v-model="registerForm.confirmPassword" 
							type="password" 
							placeholder="请再次输入确认密码" 
							clearable 
							show-password 
							prefix-icon="el-icon-circle-check"
							@keyup.enter.native="handleRegister">
						</el-input>
					</el-form-item>

					<!-- 隐隐条款勾选 -->
					<div class="terms-box">
						<el-checkbox v-model="registerForm.agreeTerms">
							我已阅读并同意 <span class="term-link">《系统安全与服务条款》</span>
						</el-checkbox>
					</div>
				</el-form>
			</div>

			<!-- 底部提交与返回登录区 -->
			<div class="card-footer">
				<el-button 
					class="submit-reg-btn" 
					:loading="loading" 
					@click="handleRegister">
					<span>{{ loading ? '正在创建账号...' : '立即提交并创建账号' }}</span>
					<i v-if="!loading" class="el-icon-check arrow-icon"></i>
				</el-button>

				<div class="action-links">
					<span class="tip-text">已有注册账号？</span>
					<el-button type="text" class="login-btn" @click="goLogin">
						<i class="el-icon-back"></i> 返回登录入口
					</el-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { Message } from 'element-ui';
import { register_auth } from '@/api'; // 对应后端的注册接口 API

export default {
	name: 'Register',
	data() {
		// 自定义校验：确认密码一致性
		const validateConfirmPass = (rule, value, callback) => {
			if (value === '') {
				callback(new Error('请再次输入密码'));
			} else if (value !== this.registerForm.password) {
				callback(new Error('两次输入的密码不一致'));
			} else {
				callback();
			}
		};

		return {
			loading: false,
			isErrorShake: false,
			registerForm: {
				username: '',
				email: '',
				password: '',
				confirmPassword: '',
				agreeTerms: true
			},
			registerRules: {
				username: [
					{ required: true, message: '请输入用户名', trigger: 'blur' },
					{ min: 3, max: 20, message: '用户名长度需在 3 到 20 个字符之间', trigger: 'blur' }
				],
				email: [
					{ required: true, message: '请输入邮箱地址', trigger: 'blur' },
					{ type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] }
				],
				password: [
					{ required: true, message: '请设置密码', trigger: 'blur' },
					{ min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
				],
				confirmPassword: [
					{ required: true, validator: validateConfirmPass, trigger: 'blur' }
				]
			}
		};
	},
	methods: {
		// 错误抖动
		triggerShake() {
			this.isErrorShake = true;
			setTimeout(() => {
				this.isErrorShake = false;
			}, 600);
		},

		// 返回登录
		goLogin() {
			if (this.$router) {
				this.$router.push('/');
			}
		},

		// 提交注册逻辑
		handleRegister() {
			this.$refs.registerForm.validate(async (valid) => {
				if (!valid) {
					this.triggerShake();
					return;
				}

				if (!this.registerForm.agreeTerms) {
					Message.warning({ message: '请先勾选并同意服务条款', center: true });
					return;
				}

				this.loading = true;
				try {
					const payload = {
						username: this.registerForm.username.trim(),
						email: this.registerForm.email.trim(),
						password: this.registerForm.password.trim()
					};

					// 调用注册接口 API
					const res = await register_auth(payload);
					const resData = res && res.data ? res.data : res;

					if (resData && (resData.code == 1000 || resData.success)) {
						Message.success({ message: resData.msg || '注册成功！正在跳转至登录页面...', center: true });
						setTimeout(() => {
							this.goLogin();
						}, 1200);
					} else {
						Message.error({ message: (resData && resData.msg) || '注册失败，该用户名或邮箱已被注册', center: true });
						this.triggerShake();
					}
				} catch (err) {
					Message.error({ message: err.message || '网络或服务器异常，注册失败', center: true });
					this.triggerShake();
				} finally {
					this.loading = false;
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.register-container {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: #090d16;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 100;
	overflow-y: auto;
	padding: 20px;
	box-sizing: border-box;

	/* 背景点阵与高感光晕 */
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

		&.orb-emerald {
			top: -10%;
			right: 15%;
			background: rgba(16, 185, 129, 0.15);
		}

		&.orb-cyan {
			bottom: -10%;
			left: 15%;
			background: rgba(14, 165, 233, 0.18);
		}
	}

	/* 注册卡片 */
	.register-card {
		position: relative;
		z-index: 10;
		width: 440px;
		background: rgba(18, 24, 38, 0.8);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 22px;
		padding: 36px 38px 28px;
		box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15);
		transition: all 0.3s ease;

		&:hover {
			border-color: rgba(16, 185, 129, 0.3);
			box-shadow: 0 35px 80px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.1);
		}

		.security-badge {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 4px 12px;
			background: rgba(16, 185, 129, 0.1);
			border: 1px solid rgba(16, 185, 129, 0.3);
			border-radius: 20px;
			color: #34d399;
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 1px;
			margin-bottom: 20px;
		}

		.card-header {
			text-align: center;
			margin-bottom: 24px;

			.user-icon-box {
				position: relative;
				width: 58px;
				height: 58px;
				margin: 0 auto 14px;
				background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(14, 165, 233, 0.2));
				border: 1px solid rgba(52, 211, 153, 0.3);
				border-radius: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #34d399;
				font-size: 26px;

				.icon-pulse {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 18px;
					border: 1px solid #34d399;
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
			.el-form-item {
				margin-bottom: 16px;
			}

			::v-deep .el-input__inner {
				background-color: rgba(10, 15, 26, 0.85) !important;
				border: 1px solid #27272a !important;
				color: #f8fafc !important;
				height: 46px;
				line-height: 46px;
				font-size: 14px;
				border-radius: 10px;
				padding-left: 42px !important;
				transition: all 0.3s ease;

				&:focus {
					border-color: #34d399 !important;
					box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18) !important;
				}

				&::placeholder {
					color: #64748b;
				}
			}

			::v-deep .el-input__prefix {
				left: 14px;
				color: #64748b;

				i {
					line-height: 46px;
					font-size: 17px;
				}
			}

			.terms-box {
				margin: 12px 0 18px;

				::v-deep .el-checkbox {
					display: flex;
					align-items: center;
				}

				::v-deep .el-checkbox__label {
					color: #94a3b8;
					font-size: 12px;
					padding-left: 8px;
				}

				::v-deep .el-checkbox__inner {
					background-color: rgba(10, 15, 26, 0.8);
					border-color: #3f3f46;
					border-radius: 4px;
				}

				::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
					background-color: #10b981;
					border-color: #10b981;
				}

				.term-link {
					color: #38bdf8;
					cursor: pointer;

					&:hover {
						text-decoration: underline;
					}
				}
			}
		}

		.card-footer {
			.submit-reg-btn {
				width: 100%;
				height: 48px;
				background: linear-gradient(135deg, #10b981, #0ea5e9) !important;
				border: none !important;
				color: #ffffff !important;
				font-size: 15px;
				font-weight: 600;
				border-radius: 10px;
				box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
				transition: all 0.3s ease;
				display: flex;
				justify-content: center;
				align-items: center;

				.arrow-icon {
					margin-left: 8px;
					font-size: 16px;
				}

				&:hover {
					transform: translateY(-1px);
					box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45);
				}
			}

			.action-links {
				margin-top: 16px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 13px;

				.tip-text {
					color: #64748b;
				}

				.login-btn {
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