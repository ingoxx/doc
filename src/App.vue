<template>
	<div id="app">
		<!-- 路由出口：登录、注册、重置密码、主页面等，全部交由 vue-router 统一渲染切换 -->
		<router-view :key="$route.fullPath" />
	</div>
</template>

<script>
export default {
	name: 'App'
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
</style>