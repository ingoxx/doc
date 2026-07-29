const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
	transpileDependencies: true
})

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util'); // Node.js 原生 GBK 解码器

// 将 Windows CMD 的 GBK 编码转为清晰无乱码的 UTF-8 中文
function decodeGbk(buffer) {
	if (!buffer) return '';
	try {
		return new TextDecoder('gbk').decode(buffer);
	} catch (e) {
		return buffer.toString('utf8');
	}
}

function parseJsonBody(req) {
	return new Promise((resolve) => {
		if (req.body && Object.keys(req.body).length > 0) {
			return resolve(req.body);
		}
		let body = '';
		req.on('data', chunk => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				resolve(JSON.parse(body || '{}'));
			} catch (e) {
				resolve({});
			}
		});
	});
}

module.exports = {
	devServer: {
		onBeforeSetupMiddleware(devServer) {
			if (!devServer || !devServer.app) return;

			devServer.app.post('/api/svn-commit-docx', async (req, res) => {
				try {
					const body = await parseJsonBody(req);
					const { repoUrl, username, password, title, solution, commitMsg } = body;

					if (!repoUrl || !username || !password) {
						return res.status(400).json({ code: 400, msg: '缺少必要的 SVN 账号、密码或仓库地址' });
					}

					const tempDir = path.join(__dirname, 'temp_svn_docs');
					if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

					const safeTitle = (title || '排错文档').replace(/[\/\\:*?"<>|]/g, '_');
					const docxFileName = safeTitle.endsWith('.docx') ? safeTitle : `${safeTitle}.docx`;
					const tempFilePath = path.join(tempDir, docxFileName);

					const wordHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
            <head><meta charset='utf-8'></head>
            <body style="font-family: Microsoft YaHei; font-size: 11pt;">
              <h2>${title}</h2>
              <pre style="font-family: Consolas; background: #f8fafc; padding: 10px;">${solution}</pre>
            </body>
            </html>`;

					fs.writeFileSync(tempFilePath, '\ufeff' + wordHtml, 'utf8');

					let cleanRepoUrl = repoUrl.trim();
					const targetSvnUrl = cleanRepoUrl.endsWith('/')
						? `${cleanRepoUrl}${encodeURIComponent(docxFileName)}`
						: `${cleanRepoUrl}/${encodeURIComponent(docxFileName)}`;

					const svnCmd = `svn import "${tempFilePath}" "${targetSvnUrl}" -m "${commitMsg || 'Auto Commit'}" --username "${username}" --password "${password}" --non-interactive --trust-server-cert --trust-server-cert-failures=unknown-ca,cn-mismatch,expired,not-yet-valid,other`;

					console.log('\n----------------------------------------');
					console.log('[SVN Proxy Node] 正在发起提交:');
					console.log(`[目标路径]: ${targetSvnUrl}`);

					// 使用 encoding: 'buffer' 接收原生字节流
					exec(svnCmd, { encoding: 'buffer' }, (error, stdoutBuf, stderrBuf) => {
						// 清理临时文件
						if (fs.existsSync(tempFilePath)) {
							try { fs.unlinkSync(tempFilePath); } catch (e) { }
						}

						// 将 GBK 字节流解码为正常中文
						const stdout = decodeGbk(stdoutBuf);
						const stderr = decodeGbk(stderrBuf);

						if (error) {
							const errorDetails = stderr || stdout || error.message || '命令行异常';
							console.error('[SVN 报错信息如下]:\n', errorDetails);

							if (errorDetails.includes('not recognized') || errorDetails.includes('不是内部或外部命令') || errorDetails.includes('ENOENT')) {
								return res.status(500).json({
									code: 500,
									msg: '当前 Windows 电脑未识别到 svn 命令！请确保安装了 TortoiseSVN 并勾选了 Command Line Client Tools。'
								});
							}

							return res.status(500).json({ code: 500, msg: 'SVN 报错: ' + errorDetails });
						}

						console.log('[SVN 提交成功输出]:\n', stdout);
						console.log('----------------------------------------\n');
						res.json({ code: 1000, msg: '成功提交至 SVN 仓库！', output: stdout });
					});

				} catch (err) {
					console.error('[SVN Proxy Node] 接口内部报错:', err);
					res.status(500).json({ code: 500, msg: 'Node 服务端内部异常: ' + err.message });
				}
			});
		}
	}
}