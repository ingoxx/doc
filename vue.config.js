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
					const { repoUrl, username, password, title, solution, commitMsg, isAttachment, fileName, fileBase64 } = body;

					if (!repoUrl || !username || !password) {
						return res.status(400).json({ code: 400, msg: '缺少必要的 SVN 账号、密码或仓库地址' });
					}

					const tempDir = path.join(__dirname, 'temp_svn_docs');
					if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

					let targetFileName = '';
					let tempFilePath = '';

					// ================= 分支 1：如果是提交附件（保持真实原文件名和二进制格式） =================
					if (isAttachment || fileBase64) {
						const rawFileName = (fileName || title || 'attachment').replace(/[\/\\:*?"<>|]/g, '_');
						targetFileName = rawFileName;
						tempFilePath = path.join(tempDir, targetFileName);

						if (fileBase64) {
							// 将前端传过来的 Base64 还原为真实的二进制文件 (支持 .tgz, .zip, .pdf, .png 等任何格式)
							const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
							const fileBuffer = Buffer.from(base64Data, 'base64');
							fs.writeFileSync(tempFilePath, fileBuffer);
						} else {
							fs.writeFileSync(tempFilePath, solution || '', 'utf8');
						}
					} 
					// ================= 分支 2：原有的排错文档正文提交 (.docx) - 保持原样完全不动 =================
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
					// 如果地址结尾带有旧文件名，将其剔除只保留目录路径
					if (/\.[a-zA-Z0-9]+$/i.test(cleanRepoUrl)) {
						cleanRepoUrl = cleanRepoUrl.substring(0, cleanRepoUrl.lastIndexOf('/') + 1);
					}

					const targetSvnUrl = cleanRepoUrl.endsWith('/')
						? `${cleanRepoUrl}${encodeURIComponent(targetFileName)}`
						: `${cleanRepoUrl}/${encodeURIComponent(targetFileName)}`;

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