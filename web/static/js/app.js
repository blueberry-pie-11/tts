document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const textInput = document.getElementById('text');
    const voiceSelect = document.getElementById('voice');
    const styleSelect = document.getElementById('style');
    const rateInput = document.getElementById('rate');
    const rateValue = document.getElementById('rateValue');
    const pitchInput = document.getElementById('pitch');
    const pitchValue = document.getElementById('pitchValue');
    const apiKeyInput = document.getElementById('api-key');
    const apiKeyGroup = document.getElementById('api-key-group');
    const speakButton = document.getElementById('speak');
    const downloadButton = document.getElementById('download');
    const copyLinkButton = document.getElementById('copyLink');
    const copyHttpTtsLinkButton = document.getElementById('copyHttpTtsLink');
    const audioPlayer = document.getElementById('audioPlayer');
    const resultSection = document.getElementById('resultSection');
    const charCount = document.getElementById('charCount');
    
    // 保存最后一个音频URL
    let lastAudioUrl = '';
    // 存储语音数据
    let voicesData = [];
    
    // 初始化
    initVoicesList();
    initEventListeners();
    
    // 更新字符计数
    textInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
    
    // 更新语速值显示
    rateInput.addEventListener('input', function() {
        const value = this.value;
        rateValue.textContent = value + '%';
    });
    
    // 更新语调值显示
    pitchInput.addEventListener('input', function() {
        const value = this.value;
        pitchValue.textContent = value + '%';
    });
    
    // 语音选择变化时更新可用风格
    voiceSelect.addEventListener('change', function() {
        updateStyleOptions();
    });

    // 获取可用语音列表
    async function initVoicesList() {
        try {
            const response = await fetch(`${config.basePath}/voices`);
            if (!response.ok) throw new Error('获取语音列表失败');
            
            voicesData = await response.json();
            
            // 清空并重建选项
            voiceSelect.innerHTML = '';
            
            // 按语言和名称分组
            const voicesByLocale = {};
            
            voicesData.forEach(voice => {
                if (!voicesByLocale[voice.locale]) {
                    voicesByLocale[voice.locale] = [];
                }
                voicesByLocale[voice.locale].push(voice);
            });
            
            // 创建选项组
            for (const locale in voicesByLocale) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = voicesByLocale[locale][0].locale_name;
                
                voicesByLocale[locale].forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.short_name;
                    option.textContent = `${voice.local_name || voice.display_name} (${voice.gender})`;
                    
                    // 如果是默认语音则选中
                    if (voice.short_name === config.defaultVoice) {
                        option.selected = true;
                    }
                    
                    optgroup.appendChild(option);
                });
                
                voiceSelect.appendChild(optgroup);
            }

            // 初始化风格列表
            updateStyleOptions();
        } catch (error) {
            console.error('获取语音列表失败:', error);
            voiceSelect.innerHTML = '<option value="">无法加载语音列表</option>';
        }
    }
    
    // 更新风格选项
    function updateStyleOptions() {
        // 清空风格选择
        styleSelect.innerHTML = '';

        // 获取当前选中的语音
        const selectedVoice = voiceSelect.value;
        const voiceData = voicesData.find(v => v.short_name === selectedVoice);

        if (!voiceData || !voiceData.style_list || voiceData.style_list.length === 0) {
            // 如果没有可用风格，添加默认选项
            const option = document.createElement('option');
            option.value = "general";
            option.textContent = "普通";
            styleSelect.appendChild(option);
            return;
        }

        // 添加可用风格选项
        voiceData.style_list.forEach(style => {
            const option = document.createElement('option');
            option.value = style
            option.textContent = style

            // 如果是默认风格则选中
            if (style === config.defaultStyle ||
                (!config.defaultStyle && style === "general")) {
                option.selected = true;
            }

            styleSelect.appendChild(option);
        });
    }

    // 初始化事件监听器
    function initEventListeners() {
        // 转换按钮点击事件
        speakButton.addEventListener('click', generateSpeech);
        
        // 下载按钮点击事件
        downloadButton.addEventListener('click', function() {
            if (lastAudioUrl) {
                const a = document.createElement('a');
                a.href = lastAudioUrl;
                a.download = 'speech.mp3';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
        
        // 复制链接按钮点击事件
        copyLinkButton.addEventListener('click', function() {
            if (lastAudioUrl) {
                // 获取完整的URL，包括域名部分
                const fullUrl = new URL(lastAudioUrl, window.location.origin).href;
                copyToClipboard(fullUrl);
            }
        });

        // 复制HttpTTS链接按钮点击事件
        copyHttpTtsLinkButton.addEventListener('click', function() {
            const text = textInput.value.trim();
            if (!text) {
                alert('请输入要转换的文本');
                return;
            }

            const voice = voiceSelect.value;
            const style = styleSelect.value;
            const rate = rateInput.value;
            const pitch = pitchInput.value;
            const apiKey = apiKeyInput.value.trim();

            // 构建HttpTTS链接
            let httpTtsLink = `${window.location.origin}${config.basePath}/tts?t={{java.encodeURI(speakText)}}&v=${voice}&r={{speakSpeed*4}}&p=${pitch}&s=${style}`;

            // 添加API Key参数（如果有）
            if (apiKey) {
                httpTtsLink += `&api_key=${apiKey}`;
            }

            copyToClipboard(httpTtsLink);
        });
    }
    
    // 复制内容到剪贴板的通用函数
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('链接已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            // 兼容处理
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                alert('链接已复制到剪贴板');
            } catch (err) {
                console.error('复制失败:', err);
            }

            document.body.removeChild(textArea);
        });
    }

    // 生成语音
    async function generateSpeech() {
        const text = textInput.value.trim();
        if (!text) {
            alert('请输入要转换的文本');
            return;
        }
        
        const voice = voiceSelect.value;
        const style = styleSelect.value;
        const rate = rateInput.value;
        const pitch = pitchInput.value;
        const apiKey = apiKeyInput.value.trim();
        
        // 禁用按钮，显示加载状态
        speakButton.disabled = true;
        speakButton.textContent = '生成中...';
        
        try {
            // 构建URL参数
            const params = new URLSearchParams({
                t: text,
                v: voice,
                s: style,
                r: rate,
                p: pitch
            });
            
            // 添加API Key参数（如果有）
            if (apiKey) {
                params.append('api_key', apiKey);
            }

            const url = `${config.basePath}/tts?${params.toString()}`;
            
            // 使用fetch发送请求以便捕获HTTP状态码
            const response = await fetch(url);

            if (response.status === 401) {
                // 显示API Key输入框
                apiKeyGroup.style.display = 'flex';
                alert('请输入有效的API Key以继续操作');
                throw new Error('需要API Key授权');
            }

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            // 获取音频blob
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            // 更新音频播放器
            audioPlayer.src = audioUrl;
            lastAudioUrl = url; // 保存原始URL用于下载和复制链接
            
            // 显示结果区域
            resultSection.style.display = 'block';
            
            // 播放音频
            audioPlayer.play();
        } catch (error) {
            console.error('生成语音失败:', error);
            if (error.message !== '需要API Key授权') {
                alert('生成语音失败，请重试');
            }
        } finally {
            // 恢复按钮状态
            speakButton.disabled = false;
            speakButton.textContent = '转换为语音';
        }
    }
});