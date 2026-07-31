const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
	transpileDependencies: true,
	devServer: {
		host: '0.0.0.0',
		port: 8080,
		allowedHosts: 'all'
	}
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
					const { repoUrl, username, password, title, solution, commitMsg, isAttachment, fileName, fileBase64 } = body;

					if (!repoUrl || !username || !password) {
						return res.status(400).json({ code: 400, msg: '缺少必要的 SVN 账号、密码或仓库地址' });
					}

					const tempDir = path.join(__dirname, 'temp_svn_docs');
					if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

					let targetFileName = '';
					let tempFilePath = '';

					// ================= 分支 1：提交附件文件 =================
					if (isAttachment || fileBase64) {
						const rawFileName = (fileName || title || 'attachment').replace(/[\/\\:*?"<>|]/g, '_');
						targetFileName = rawFileName;
						tempFilePath = path.join(tempDir, targetFileName);

						if (fileBase64) {
							const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
							const fileBuffer = Buffer.from(base64Data, 'base64');
							fs.writeFileSync(tempFilePath, fileBuffer);
						} else {
							fs.writeFileSync(tempFilePath, solution || '', 'utf8');
						}
					} 
					// ================= 分支 2：排错文档正文提交 (.docx) =================
					else {
						const safeTitle = (title || '排错文档').replace(/[\/\\:*?"<>|]/g, '_');
						targetFileName = safeTitle.endsWith('.docx') ? safeTitle : `${safeTitle}.docx`;
						tempFilePath = path.join(tempDir, targetFileName);

						const wordHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
            <head><meta charset='utf-8'></head>
            <body style="font-family: Microsoft YaHei; font-size: 11pt;">
              <h2>${title}</h2>
              <pre style="font-family: Consolas; background: #f8fafc; padding: 10px;">${solution}</pre>
            </body>
            </html>`;

						fs.writeFileSync(tempFilePath, '\ufeff' + wordHtml, 'utf8');
					}

					let cleanRepoUrl = repoUrl.trim();
					if (/\.[a-zA-Z0-9]+$/i.test(cleanRepoUrl)) {
						cleanRepoUrl = cleanRepoUrl.substring(0, cleanRepoUrl.lastIndexOf('/') + 1);
					}

					const targetSvnUrl = cleanRepoUrl.endsWith('/')
						? `${cleanRepoUrl}${encodeURIComponent(targetFileName)}`
						: `${cleanRepoUrl}/${encodeURIComponent(targetFileName)}`;

					console.log('\n----------------------------------------');
					console.log('[SVN Proxy Node] 正在发起提交/覆盖:');
					console.log(`[目标路径]: ${targetSvnUrl}`);

					const authFlags = `--username "${username}" --password "${password}" --non-interactive --trust-server-cert --trust-server-cert-failures=unknown-ca,cn-mismatch,expired,not-yet-valid,other`;
					
					// 核心策略：优先使用 svnmucc put 命令（自动支持新增和更新覆盖）
					const svnMuccCmd = `svnmucc -m "${commitMsg || 'Auto Commit'}" ${authFlags} put "${tempFilePath}" "${targetSvnUrl}"`;

					exec(svnMuccCmd, { encoding: 'buffer' }, (muccErr, stdoutBuf, stderrBuf) => {
						const muccStdout = decodeGbk(stdoutBuf);
						const muccStderr = decodeGbk(stderrBuf);

						// 如果 svnmucc 执行成功，直接响应
						if (!muccErr) {
							if (fs.existsSync(tempFilePath)) { try { fs.unlinkSync(tempFilePath); } catch (e) { } }
							console.log('[SVN 提交/更新成功输出]:\n', muccStdout);
							console.log('----------------------------------------\n');
							return res.json({ code: 1000, msg: '已成功提交/更新至 SVN 仓库！', output: muccStdout });
						}

						console.warn('[svnmucc 执行受限，降级使用先 delete 再 import 策略]:', muccStderr || muccErr.message);

						// 兜底降级方案：如果不含 svnmucc，先尝试 delete 旧文件（即使文件不存在报错也会继续执行 import）
						const svnDeleteCmd = `svn delete "${targetSvnUrl}" -m "Auto clean before update" ${authFlags}`;
						const svnImportCmd = `svn import "${tempFilePath}" "${targetSvnUrl}" -m "${commitMsg || 'Auto Commit'}" ${authFlags}`;

						exec(svnDeleteCmd, { encoding: 'buffer' }, () => {
							exec(svnImportCmd, { encoding: 'buffer' }, (importErr, importStdoutBuf, importStderrBuf) => {
								if (fs.existsSync(tempFilePath)) { try { fs.unlinkSync(tempFilePath); } catch (e) { } }

								const importStdout = decodeGbk(importStdoutBuf);
								const importStderr = decodeGbk(importStderrBuf);

								if (importErr) {
									const errorDetails = importStderr || importStdout || importErr.message || '命令行异常';
									console.error('[SVN 报错信息如下]:\n', errorDetails);
									return res.status(500).json({ code: 500, msg: 'SVN 报错: ' + errorDetails });
								}

								console.log('[SVN 提交/覆盖成功输出]:\n', importStdout);
								console.log('----------------------------------------\n');
								res.json({ code: 1000, msg: '已成功提交/更新至 SVN 仓库！', output: importStdout });
							});
						});
					});

				} catch (err) {
					console.error('[SVN Proxy Node] 接口内部报错:', err);
					res.status(500).json({ code: 500, msg: 'Node 服务端内部异常: ' + err.message });
				}
			});
		}
	}
}