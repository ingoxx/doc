<template>
	<div id="app">
		<!-- 1. 控制总开关：如果有授权口令 (isAuth为true)，渲染主页面/文档库内容 -->
		<router-view v-if="isAuth" />

		<!-- 2. 全局文档密码拦截验证终端 (毛玻璃暗黑科技风) -->
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
						<span>DOCUMENT VAULT PROTECTED</span>
					</div>

					<!-- 卡片头部标题区 -->
					<div class="card-header">
						<div class="lock-icon-box">
							<i class="el-icon-lock"></i>
							<div class="icon-pulse"></div>
						</div>
						<h2 class="title">{{ secret_dia_title }}</h2>
						<p class="subtitle">受保护的故障知识库，请输入密钥访问</p>
					</div>

					<!-- 输入框区 -->
					<div class="card-body">
						<el-form @submit.native.prevent="start">
							<el-input 
								ref="secretInput" 
								v-model="secret_key" 
								type="password" 
								placeholder="请输入终端访问口令..." 
								clearable 
								show-password 
								prefix-icon="el-icon-key"
								@keyup.enter.native="start">
							</el-input>
						</el-form>
					</div>

					<!-- 底部提交操作区 -->
					<div class="card-footer">
						<el-button 
							class="unlock-btn" 
							:loading="secret_loading" 
							@click="start" 
							tabindex="0">
							<span>{{ secret_loading ? '密钥校验中...' : '安全解锁并接入' }}</span>
							<i v-if="!secret_loading" class="el-icon-right arrow-icon"></i>
						</el-button>

						<div class="footer-tips">
							<i class="el-icon-info"></i> 支持 Enter 键快速解锁
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
			isAuth: false, // 授权状态拦截开关
			dialogVisible: false,
			secret_dia_title: 'TroubleDocs 故障文档库',
			secret_key: '',
			secret_loading: false,
			isErrorShake: false // 控制输入错误抖动动画
		};
	},
	created() {
		this.checkSign();
	},
	mounted() {
		if (this.dialogVisible) {
			this.focusInput();
		}
	},
	watch: {
		$route() {
			this.checkSign();
		},
		dialogVisible(val) {
			if (val) {
				this.focusInput();
			}
		}
	},
	methods: {
		// 自动聚焦输入框
		focusInput() {
			this.$nextTick(() => {
				if (this.$refs.secretInput) {
					this.$refs.secretInput.focus();
				}
			});
		},

		// 检查本地 Sign 状态
		checkSign() {
			const sign = localStorage.getItem('sign');
			if (sign) {
				this.isAuth = true;
				this.dialogVisible = false;
			} else {
				this.isAuth = false;
				this.dialogVisible = true;
			}
		},

		// 触发错误抖动效果
		triggerShake() {
			this.isErrorShake = true;
			setTimeout(() => {
				this.isErrorShake = false;
			}, 600);
		},

		// 解锁验证主逻辑
		async start() {
			let sign = localStorage.getItem('sign');

			// 如果本地没有存储口令，走 API 校验
			if (!sign) {
				if (!this.secret_key || !this.secret_key.trim()) {
					Message.error({ message: "请输入访问口令", center: true });
					this.triggerShake();
					this.focusInput();
					return;
				}

				this.secret_loading = true;
				try {
					const response = await login_auth({ sign: this.secret_key.trim() });
					const resData = response && response.data ? response.data : response;

					if (resData && resData.code == 1000) {
						// 验证通过，写入 localStorage
						localStorage.setItem('sign', this.secret_key.trim());
						Message.success({ message: resData.msg || "身份验证通过，欢迎使用文档库", center: true });
					} else {
						Message.error({ message: (resData && resData.msg) || "访问口令无效", center: true });
						this.secret_loading = false;
						this.triggerShake();
						this.secret_key = ''; // 校验失败自动清空
						this.focusInput();
						return;
					}
				} catch (error) {
					Message.error({ message: error.message || "网络请求异常，请稍后重试", center: true });
					this.secret_loading = false;
					this.triggerShake();
					return;
				}
			}

			// 授权成功，放行渲染路由页面并关闭验证弹窗
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
	z-index: 1999; /* 低于 Element Message 消息层(2000+) */
	overflow: hidden;

	/* 背景科技点阵网格 */
	.bg-grid-pattern {
		position: absolute;
		width: 100%;
		height: 100%;
		background-image: 
			radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
		background-size: 32px 32px;
		z-index: 1;
		pointer-events: none;
	}

	/* 柔和背景光晕 */
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

	/* 核心 Glassmorphic 验证卡片 */
	.auth-card {
		position: relative;
		z-index: 10;
		width: 400px;
		background: rgba(18, 24, 38, 0.75);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 40px 36px 32px;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
		transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

		&:hover {
			border-color: rgba(14, 165, 233, 0.3);
			box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.1);
		}

		/* 顶部 Badge */
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
			margin-bottom: 24px;

			i {
				font-size: 13px;
			}
		}

		/* 头部标题与 Icon */
		.card-header {
			text-align: center;
			margin-bottom: 30px;

			.lock-icon-box {
				position: relative;
				width: 64px;
				height: 64px;
				margin: 0 auto 18px;
				background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2));
				border: 1px solid rgba(56, 189, 248, 0.3);
				border-radius: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #38bdf8;
				font-size: 28px;

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
				letter-spacing: -0.3px;
			}

			.subtitle {
				margin: 8px 0 0;
				color: #94a3b8;
				font-size: 13px;
				line-height: 1.5;
			}
		}

		/* Element UI 输入框深度自定义 */
		.card-body {
			margin-bottom: 24px;

			::v-deep .el-input__inner {
				background-color: rgba(10, 15, 26, 0.8) !important;
				border: 1px solid #27272a !important;
				color: #f8fafc !important;
				height: 50px;
				line-height: 50px;
				font-size: 15px;
				border-radius: 10px;
				padding-left: 42px !important;
				transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

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
					line-height: 50px;
					font-size: 18px;
				}
			}

			::v-deep .el-input__suffix {
				right: 12px;

				i {
					line-height: 50px;
					font-size: 16px;
					color: #64748b;

					&:hover {
						color: #38bdf8;
					}
				}
			}
		}

		/* 底部按钮与提示 */
		.card-footer {
			.unlock-btn {
				width: 100%;
				height: 50px;
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

				span {
					display: flex;
					align-items: center;
				}

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

				&:active {
					transform: translateY(0);
				}

				&.is-loading {
					opacity: 0.8;
				}
			}

			.footer-tips {
				margin-top: 18px;
				text-align: center;
				color: #64748b;
				font-size: 12px;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 4px;

				i {
					font-size: 13px;
				}
			}
		}
	}
}

/* 呼吸脉冲动画 */
@keyframes pulse-ring {
	0% {
		transform: scale(0.95);
		opacity: 0.8;
	}
	50% {
		transform: scale(1.15);
		opacity: 0;
	}
	100% {
		transform: scale(0.95);
		opacity: 0;
	}
}

/* 错误抖动 Shake 动画 */
.shake-anim {
	animation: card-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes card-shake {
	10%, 90% { transform: translate3d(-1px, 0, 0); }
	20%, 80% { transform: translate3d(2px, 0, 0); }
	30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
	40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* 渐隐进场/退场动画 */
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