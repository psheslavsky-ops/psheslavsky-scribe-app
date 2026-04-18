import React, { createContext, useContext, useState, useCallback } from "react";

export type Language = "ru" | "en" | "de" | "es" | "fr" | "pt" | "zh" | "ja" | "ko" | "ar";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

type Translations = Record<string, Record<Language, string>>;

const T: Translations = {
  // Header
  "service_subtitle": { ru: "Сервис транскрибации бизнес-аналитика", en: "Business analyst transcription service", de: "Transkriptionsdienst für Geschäftsanalysten", es: "Servicio de transcripción de analista de negocios", fr: "Service de transcription pour analyste d'affaires", pt: "Serviço de transcrição para analista de negócios", zh: "商业分析师转录服务", ja: "ビジネスアナリスト文字起こしサービス", ko: "비즈니스 분석가 전사 서비스", ar: "خدمة نسخ محلل الأعمال" },
  // Auth
  "sign_in": { ru: "Войдите в аккаунт", en: "Sign in to your account", de: "Melden Sie sich an", es: "Inicie sesión", fr: "Connectez-vous", pt: "Entre na sua conta", zh: "登录您的帐户", ja: "アカウントにログイン", ko: "계정에 로그인", ar: "سجل الدخول" },
  "sign_up_label": { ru: "Создайте аккаунт", en: "Create an account", de: "Konto erstellen", es: "Crear una cuenta", fr: "Créer un compte", pt: "Criar uma conta", zh: "创建帐户", ja: "アカウント作成", ko: "계정 만들기", ar: "إنشاء حساب" },
  "sign_in_google": { ru: "Войти через Google", en: "Sign in with Google", de: "Mit Google anmelden", es: "Iniciar sesión con Google", fr: "Se connecter avec Google", pt: "Entrar com Google", zh: "使用Google登录", ja: "Googleでログイン", ko: "Google로 로그인", ar: "تسجيل الدخول بواسطة Google" },
  "or": { ru: "или", en: "or", de: "oder", es: "o", fr: "ou", pt: "ou", zh: "或", ja: "または", ko: "또는", ar: "أو" },
  "email": { ru: "Email", en: "Email", de: "E-Mail", es: "Correo electrónico", fr: "E-mail", pt: "E-mail", zh: "电子邮件", ja: "メール", ko: "이메일", ar: "البريد الإلكتروني" },
  "password": { ru: "Пароль", en: "Password", de: "Passwort", es: "Contraseña", fr: "Mot de passe", pt: "Senha", zh: "密码", ja: "パスワード", ko: "비밀번호", ar: "كلمة المرور" },
  "sign_in_btn": { ru: "Войти", en: "Sign in", de: "Anmelden", es: "Iniciar sesión", fr: "Se connecter", pt: "Entrar", zh: "登录", ja: "ログイン", ko: "로그인", ar: "تسجيل الدخول" },
  "sign_up_btn": { ru: "Зарегистрироваться", en: "Sign up", de: "Registrieren", es: "Registrarse", fr: "S'inscrire", pt: "Cadastrar-se", zh: "注册", ja: "登録", ko: "회원가입", ar: "التسجيل" },
  "no_account": { ru: "Нет аккаунта?", en: "No account?", de: "Kein Konto?", es: "¿Sin cuenta?", fr: "Pas de compte ?", pt: "Sem conta?", zh: "没有帐户？", ja: "アカウントがない？", ko: "계정이 없나요?", ar: "لا يوجد حساب؟" },
  "have_account": { ru: "Уже есть аккаунт?", en: "Already have an account?", de: "Haben Sie bereits ein Konto?", es: "¿Ya tiene una cuenta?", fr: "Déjà un compte ?", pt: "Já tem uma conta?", zh: "已有帐户？", ja: "アカウントをお持ちですか？", ko: "이미 계정이 있나요?", ar: "هل لديك حساب؟" },
  "consent_text": { ru: "Нажимая кнопку, вы соглашаетесь с обработкой данных Psheslavsky©", en: "By clicking, you agree to data processing by Psheslavsky©", de: "Durch Klicken stimmen Sie der Datenverarbeitung durch Psheslavsky© zu", es: "Al hacer clic, acepta el procesamiento de datos por Psheslavsky©", fr: "En cliquant, vous acceptez le traitement des données par Psheslavsky©", pt: "Ao clicar, você concorda com o processamento de dados pela Psheslavsky©", zh: "点击即表示您同意Psheslavsky©处理数据", ja: "クリックすることで、Psheslavsky©によるデータ処理に同意します", ko: "클릭하면 Psheslavsky©의 데이터 처리에 동의합니다", ar: "بالنقر، أنت توافق على معالجة البيانات بواسطة Psheslavsky©" },
  "check_email": { ru: "Проверьте почту для подтверждения регистрации", en: "Check your email to confirm registration", de: "Überprüfen Sie Ihre E-Mail zur Bestätigung", es: "Revise su correo para confirmar el registro", fr: "Vérifiez votre e-mail pour confirmer", pt: "Verifique seu e-mail para confirmar", zh: "请检查您的电子邮件以确认注册", ja: "登録確認メールをご確認ください", ko: "등록 확인을 위해 이메일을 확인하세요", ar: "تحقق من بريدك الإلكتروني لتأكيد التسجيل" },
  // Main page
  "record_audio_label": { ru: "Запишите аудио напрямую с микрофона", en: "Record audio directly from microphone", de: "Audio direkt vom Mikrofon aufnehmen", es: "Grabe audio directamente del micrófono", fr: "Enregistrez l'audio directement depuis le microphone", pt: "Grave áudio diretamente do microfone", zh: "直接从麦克风录制音频", ja: "マイクから直接録音", ko: "마이크에서 직접 오디오 녹음", ar: "سجل الصوت مباشرة من الميكروفون" },
  "transcriptions": { ru: "Транскрипции", en: "Transcriptions", de: "Transkriptionen", es: "Transcripciones", fr: "Transcriptions", pt: "Transcrições", zh: "转录", ja: "文字起こし", ko: "전사", ar: "النسخ" },
  "features": { ru: "Возможности", en: "Features", de: "Funktionen", es: "Funcionalidades", fr: "Fonctionnalités", pt: "Funcionalidades", zh: "功能", ja: "機能", ko: "기능", ar: "الميزات" },
  "feat_record": { ru: "Запись аудио", en: "Audio recording", de: "Audioaufnahme", es: "Grabación de audio", fr: "Enregistrement audio", pt: "Gravação de áudio", zh: "音频录制", ja: "音声録音", ko: "오디오 녹음", ar: "تسجيل الصوت" },
  "feat_record_desc": { ru: "Запись прямо с микрофона для мгновенной обработки", en: "Record directly from microphone for instant processing", de: "Direkt vom Mikrofon aufnehmen", es: "Grabe directamente desde el micrófono", fr: "Enregistrez depuis le microphone", pt: "Grave direto do microfone", zh: "从麦克风直接录制以即时处理", ja: "マイクから直接録音して即座に処理", ko: "즉시 처리를 위해 마이크에서 직접 녹음", ar: "سجل مباشرة من الميكروفون" },
  "feat_ai": { ru: "ИИ-артефакты бизнес-анализа", en: "AI business analysis artifacts", de: "KI-Geschäftsanalyse-Artefakte", es: "Artefactos de IA para análisis de negocios", fr: "Artefacts IA d'analyse commerciale", pt: "Artefatos de IA para análise de negócios", zh: "AI商业分析产物", ja: "AIビジネス分析アーティファクト", ko: "AI 비즈니스 분석 산출물", ar: "مخرجات الذكاء الاصطناعي لتحليل الأعمال" },
  "feat_ai_desc": { ru: "Резюме, протоколы, требования, концепция, пользовательские истории и блок-схемы", en: "Summaries, protocols, requirements, vision, user stories and flowcharts", de: "Zusammenfassungen, Protokolle, Anforderungen, Vision, User Stories und Flussdiagramme", es: "Resúmenes, protocolos, requisitos, visión, historias de usuario y diagramas de flujo", fr: "Résumés, protocoles, exigences, vision, user stories et organigrammes", pt: "Resumos, protocolos, requisitos, visão, histórias de usuário e fluxogramas", zh: "摘要、协议、需求、愿景、用户故事和流程图", ja: "要約、議事録、要件、ビジョン、ユーザーストーリー、フローチャート", ko: "요약, 회의록, 요구사항, 비전, 사용자 스토리 및 순서도", ar: "ملخصات، محاضر، متطلبات، رؤية، قصص مستخدم ومخططات" },
  "feat_export": { ru: "Экспорт", en: "Export", de: "Export", es: "Exportar", fr: "Exporter", pt: "Exportar", zh: "导出", ja: "エクスポート", ko: "내보내기", ar: "تصدير" },
  "feat_export_desc": { ru: "Сохранение в TXT, Word (DOCX) и draw.io", en: "Save as TXT, Word (DOCX) and draw.io", de: "Speichern als TXT, Word (DOCX) und draw.io", es: "Guardar como TXT, Word (DOCX) y draw.io", fr: "Sauvegarder en TXT, Word (DOCX) et draw.io", pt: "Salvar como TXT, Word (DOCX) e draw.io", zh: "保存为TXT、Word (DOCX) 和 draw.io", ja: "TXT、Word (DOCX)、draw.ioとして保存", ko: "TXT, Word (DOCX) 및 draw.io로 저장", ar: "حفظ كـ TXT، Word (DOCX) و draw.io" },
  "footer_text": { ru: "Scribe_ — транскрибация с ИИ", en: "Scribe_ — AI transcription", de: "Scribe_ — KI-Transkription", es: "Scribe_ — transcripción con IA", fr: "Scribe_ — transcription IA", pt: "Scribe_ — transcrição com IA", zh: "Scribe_ — AI转录", ja: "Scribe_ — AI文字起こし", ko: "Scribe_ — AI 전사", ar: "Scribe_ — النسخ بالذكاء الاصطناعي" },
  // Buttons
  "copy": { ru: "Копировать", en: "Copy", de: "Kopieren", es: "Copiar", fr: "Copier", pt: "Copiar", zh: "复制", ja: "コピー", ko: "복사", ar: "نسخ" },
  "copied": { ru: "Скопировано", en: "Copied", de: "Kopiert", es: "Copiado", fr: "Copié", pt: "Copiado", zh: "已复制", ja: "コピー済み", ko: "복사됨", ar: "تم النسخ" },
  "summary": { ru: "Резюме", en: "Summary", de: "Zusammenfassung", es: "Resumen", fr: "Résumé", pt: "Resumo", zh: "摘要", ja: "要約", ko: "요약", ar: "ملخص" },
  "protocol": { ru: "Протокол встречи", en: "Meeting protocol", de: "Besprechungsprotokoll", es: "Protocolo de reunión", fr: "Protocole de réunion", pt: "Protocolo da reunião", zh: "会议记录", ja: "議事録", ko: "회의록", ar: "محضر الاجتماع" },
  "business_reqs": { ru: "Бизнес-требования", en: "Business requirements", de: "Geschäftsanforderungen", es: "Requisitos de negocio", fr: "Exigences métier", pt: "Requisitos de negócio", zh: "业务需求", ja: "ビジネス要件", ko: "비즈니스 요구사항", ar: "متطلبات العمل" },
  "vision_scope": { ru: "Концепция и границы", en: "Vision & Scope", de: "Vision & Umfang", es: "Visión y alcance", fr: "Vision et périmètre", pt: "Visão e escopo", zh: "愿景和范围", ja: "ビジョンと範囲", ko: "비전 및 범위", ar: "الرؤية والنطاق" },
  "user_stories": { ru: "Польз. история", en: "User stories", de: "User Stories", es: "Historias de usuario", fr: "User stories", pt: "Histórias de usuário", zh: "用户故事", ja: "ユーザーストーリー", ko: "사용자 스토리", ar: "قصص المستخدم" },
  "use_cases": { ru: "Вариант использования", en: "Use cases", de: "Anwendungsfälle", es: "Casos de uso", fr: "Cas d'utilisation", pt: "Casos de uso", zh: "用例", ja: "ユースケース", ko: "유스케이스", ar: "حالات الاستخدام" },
  "flowchart": { ru: "Блок-схема", en: "Flowchart", de: "Flussdiagramm", es: "Diagrama de flujo", fr: "Organigramme", pt: "Fluxograma", zh: "流程图", ja: "フローチャート", ko: "순서도", ar: "مخطط تدفق" },
  // Status
  "processing": { ru: "Обработка...", en: "Processing...", de: "Verarbeitung...", es: "Procesando...", fr: "Traitement...", pt: "Processando...", zh: "处理中...", ja: "処理中...", ko: "처리 중...", ar: "جاري المعالجة..." },
  "done": { ru: "Готово", en: "Done", de: "Fertig", es: "Listo", fr: "Terminé", pt: "Pronto", zh: "完成", ja: "完了", ko: "완료", ar: "تم" },
  "error": { ru: "Ошибка", en: "Error", de: "Fehler", es: "Error", fr: "Erreur", pt: "Erro", zh: "错误", ja: "エラー", ko: "오류", ar: "خطأ" },
  "transcription_ready": { ru: "Транскрипция готова!", en: "Transcription ready!", de: "Transkription fertig!", es: "¡Transcripción lista!", fr: "Transcription prête !", pt: "Transcrição pronta!", zh: "转录完成！", ja: "文字起こし完了！", ko: "전사 완료!", ar: "!النسخ جاهز" },
  // Upload
  "drop_file": { ru: "Перетащите аудиофайл сюда", en: "Drop audio file here", de: "Audiodatei hierher ziehen", es: "Arrastre archivo de audio aquí", fr: "Déposez le fichier audio ici", pt: "Arraste o arquivo de áudio aqui", zh: "将音频文件拖到此处", ja: "オーディオファイルをここにドロップ", ko: "오디오 파일을 여기에 놓으세요", ar: "اسحب ملف الصوت هنا" },
  "or_click": { ru: "или нажмите для выбора файла", en: "or click to select file", de: "oder klicken Sie, um eine Datei auszuwählen", es: "o haga clic para seleccionar", fr: "ou cliquez pour sélectionner", pt: "ou clique para selecionar", zh: "或点击选择文件", ja: "またはクリックして選択", ko: "또는 클릭하여 선택", ar: "أو انقر لتحديد الملف" },
  // Feedback
  "rate_service": { ru: "Оцените работу сервиса", en: "Rate our service", de: "Bewerten Sie unseren Service", es: "Califique nuestro servicio", fr: "Évaluez notre service", pt: "Avalie nosso serviço", zh: "评价我们的服务", ja: "サービスを評価", ko: "서비스 평가", ar: "قيّم خدمتنا" },
  "what_to_improve": { ru: "Что улучшить?", en: "What to improve?", de: "Was verbessern?", es: "¿Qué mejorar?", fr: "Quoi améliorer ?", pt: "O que melhorar?", zh: "需要改进什么？", ja: "改善点は？", ko: "개선할 점은?", ar: "ما الذي يجب تحسينه؟" },
  "thanks": { ru: "Спасибо!", en: "Thank you!", de: "Danke!", es: "¡Gracias!", fr: "Merci !", pt: "Obrigado!", zh: "谢谢！", ja: "ありがとう！", ko: "감사합니다!", ar: "!شكراً" },
  "thanks_feedback": { ru: "Спасибо за участие в улучшении сервиса!", en: "Thank you for helping us improve!", de: "Danke für Ihre Hilfe bei der Verbesserung!", es: "¡Gracias por ayudarnos a mejorar!", fr: "Merci de nous aider à améliorer !", pt: "Obrigado por nos ajudar a melhorar!", zh: "感谢您帮助我们改进！", ja: "改善にご協力いただきありがとうございます！", ko: "개선에 도움을 주셔서 감사합니다!", ar: "!شكراً لمساعدتنا في التحسين" },
  "speed": { ru: "Скорость работы", en: "Speed", de: "Geschwindigkeit", es: "Velocidad", fr: "Vitesse", pt: "Velocidade", zh: "速度", ja: "速度", ko: "속도", ar: "السرعة" },
  "transcription_quality": { ru: "Качество транскрибации", en: "Transcription quality", de: "Transkriptionsqualität", es: "Calidad de transcripción", fr: "Qualité de transcription", pt: "Qualidade da transcrição", zh: "转录质量", ja: "文字起こし品質", ko: "전사 품질", ar: "جودة النسخ" },
  "artifact_quality": { ru: "Качество генерации артефактов", en: "Artifact generation quality", de: "Artefaktgenerierungsqualität", es: "Calidad de generación de artefactos", fr: "Qualité de génération", pt: "Qualidade de geração", zh: "产物生成质量", ja: "アーティファクト生成品質", ko: "산출물 생성 품질", ar: "جودة إنشاء المخرجات" },
  "ui_convenience": { ru: "Удобство интерфейса", en: "UI convenience", de: "Benutzerfreundlichkeit", es: "Comodidad de interfaz", fr: "Confort de l'interface", pt: "Conveniência da interface", zh: "界面便利性", ja: "UIの利便性", ko: "UI 편의성", ar: "سهولة الواجهة" },
  "other": { ru: "Другое", en: "Other", de: "Sonstiges", es: "Otro", fr: "Autre", pt: "Outro", zh: "其他", ja: "その他", ko: "기타", ar: "أخرى" },
  "send": { ru: "Отправить", en: "Send", de: "Senden", es: "Enviar", fr: "Envoyer", pt: "Enviar", zh: "发送", ja: "送信", ko: "보내기", ar: "إرسال" },
  "close": { ru: "Закрыть", en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar", zh: "关闭", ja: "閉じる", ko: "닫기", ar: "إغلاق" },
  "describe_improvement": { ru: "Опишите, что можно улучшить...", en: "Describe what can be improved...", de: "Beschreiben Sie, was verbessert werden kann...", es: "Describa qué se puede mejorar...", fr: "Décrivez ce qui peut être amélioré...", pt: "Descreva o que pode ser melhorado...", zh: "描述可以改进的内容...", ja: "改善できる点を説明してください...", ko: "개선할 수 있는 점을 설명하세요...", ar: "...صف ما يمكن تحسينه" },
  // Share
  "share_friend": { ru: "Поделись с другом", en: "Share with a friend", de: "Mit einem Freund teilen", es: "Comparte con un amigo", fr: "Partagez avec un ami", pt: "Compartilhe com um amigo", zh: "与朋友分享", ja: "友達と共有", ko: "친구와 공유", ar: "شارك مع صديق" },
  "copy_link": { ru: "Копировать ссылку", en: "Copy link", de: "Link kopieren", es: "Copiar enlace", fr: "Copier le lien", pt: "Copiar link", zh: "复制链接", ja: "リンクをコピー", ko: "링크 복사", ar: "نسخ الرابط" },
  "link_copied": { ru: "Ссылка скопирована", en: "Link copied", de: "Link kopiert", es: "Enlace copiado", fr: "Lien copié", pt: "Link copiado", zh: "链接已复制", ja: "リンクがコピーされました", ko: "링크 복사됨", ar: "تم نسخ الرابط" },
  "more": { ru: "Ещё...", en: "More...", de: "Mehr...", es: "Más...", fr: "Plus...", pt: "Mais...", zh: "更多...", ja: "もっと...", ko: "더보기...", ar: "...المزيد" },
  // Share tooltip
  "share_tooltip": { ru: "Сделай этот мир чуточку лучше — поделись с другом", en: "Make the world a little better — share with a friend", de: "Mach die Welt etwas besser — teile mit einem Freund", es: "Haz el mundo un poco mejor — comparte con un amigo", fr: "Rends le monde meilleur — partage avec un ami", pt: "Faça o mundo melhor — compartilhe com um amigo", zh: "让世界更美好——与朋友分享", ja: "世界をちょっと良くしよう——友達とシェア", ko: "세상을 조금 더 좋게 — 친구와 공유", ar: "اجعل العالم أفضل — شارك مع صديق" },
  // Document panels
  "generating": { ru: "Генерация документа...", en: "Generating document...", de: "Dokument wird erstellt...", es: "Generando documento...", fr: "Génération du document...", pt: "Gerando documento...", zh: "正在生成文档...", ja: "ドキュメント生成中...", ko: "문서 생성 중...", ar: "...جاري إنشاء المستند" },
  "loading": { ru: "Загрузка...", en: "Loading...", de: "Laden...", es: "Cargando...", fr: "Chargement...", pt: "Carregando...", zh: "加载中...", ja: "読み込み中...", ko: "로딩 중...", ar: "...جاري التحميل" },
  "wait_full_load": { ru: "Дождитесь полной загрузки документа", en: "Wait for document to fully load", de: "Warten Sie auf vollständiges Laden", es: "Espere a que se cargue completamente", fr: "Attendez le chargement complet", pt: "Aguarde o carregamento completo", zh: "请等待文档完全加载", ja: "ドキュメントの完全な読み込みをお待ちください", ko: "문서가 완전히 로드될 때까지 기다리세요", ar: "انتظر تحميل المستند بالكامل" },
  "saved_txt": { ru: "TXT сохранён", en: "TXT saved", de: "TXT gespeichert", es: "TXT guardado", fr: "TXT sauvegardé", pt: "TXT salvo", zh: "TXT已保存", ja: "TXT保存済み", ko: "TXT 저장됨", ar: "تم حفظ TXT" },
  "saved_docx": { ru: "DOCX сохранён", en: "DOCX saved", de: "DOCX gespeichert", es: "DOCX guardado", fr: "DOCX sauvegardé", pt: "DOCX salvo", zh: "DOCX已保存", ja: "DOCX保存済み", ko: "DOCX 저장됨", ar: "تم حفظ DOCX" },
  "saved_drawio": { ru: "Файл .drawio сохранён", en: ".drawio file saved", de: ".drawio-Datei gespeichert", es: "Archivo .drawio guardado", fr: "Fichier .drawio sauvegardé", pt: "Arquivo .drawio salvo", zh: ".drawio文件已保存", ja: ".drawioファイル保存済み", ko: ".drawio 파일 저장됨", ar: "تم حفظ ملف .drawio" },
  "google_docs": { ru: "Google Docs", en: "Google Docs", de: "Google Docs", es: "Google Docs", fr: "Google Docs", pt: "Google Docs", zh: "Google Docs", ja: "Google Docs", ko: "Google Docs", ar: "Google Docs" },
  "google_docs_hint": { ru: "Содержимое скопировано. Вставьте в новый документ Google (Ctrl+V)", en: "Content copied. Paste into new Google Doc (Ctrl+V)", de: "Inhalt kopiert. In neues Google-Dokument einfügen (Strg+V)", es: "Contenido copiado. Pegue en un nuevo Google Doc (Ctrl+V)", fr: "Contenu copié. Collez dans un nouveau Google Doc (Ctrl+V)", pt: "Conteúdo copiado. Cole em um novo Google Doc (Ctrl+V)", zh: "内容已复制。粘贴到新的Google文档中 (Ctrl+V)", ja: "コンテンツがコピーされました。新しいGoogle Docに貼り付けてください (Ctrl+V)", ko: "콘텐츠가 복사되었습니다. 새 Google 문서에 붙여넣기 (Ctrl+V)", ar: "(Ctrl+V) تم نسخ المحتوى. الصقه في مستند Google جديد" },
  "share_artifact": { ru: "Поделиться", en: "Share", de: "Teilen", es: "Compartir", fr: "Partager", pt: "Compartilhar", zh: "分享", ja: "共有", ko: "공유", ar: "مشاركة" },
  // Processing stages
  "compressing": { ru: "Сжатие аудио...", en: "Compressing audio...", de: "Audio komprimieren...", es: "Comprimiendo audio...", fr: "Compression audio...", pt: "Comprimindo áudio...", zh: "压缩音频...", ja: "オーディオ圧縮中...", ko: "오디오 압축 중...", ar: "...ضغط الصوت" },
  "decoding": { ru: "Декодирование аудио...", en: "Decoding audio...", de: "Audio dekodieren...", es: "Decodificando audio...", fr: "Décodage audio...", pt: "Decodificando áudio...", zh: "解码音频...", ja: "オーディオデコード中...", ko: "오디오 디코딩 중...", ar: "...فك ترميز الصوت" },
  "resampling": { ru: "Сжатие до 16 кГц моно...", en: "Resampling to 16kHz mono...", de: "Resampling auf 16kHz Mono...", es: "Remuestreo a 16kHz mono...", fr: "Rééchantillonnage 16kHz mono...", pt: "Reamostragem para 16kHz mono...", zh: "重采样至16kHz单声道...", ja: "16kHzモノにリサンプリング...", ko: "16kHz 모노로 리샘플링...", ar: "...إعادة العينة إلى 16 كيلو هرتز أحادي" },
  "transcribing": { ru: "Транскрибация...", en: "Transcribing...", de: "Transkription...", es: "Transcribiendo...", fr: "Transcription...", pt: "Transcrevendo...", zh: "转录中...", ja: "文字起こし中...", ko: "전사 중...", ar: "...النسخ" },
  "transcribing_chunk": { ru: "Транскрибация чанка", en: "Transcribing chunk", de: "Chunk transkribieren", es: "Transcribiendo fragmento", fr: "Transcription du fragment", pt: "Transcrevendo trecho", zh: "转录分块", ja: "チャンク文字起こし", ko: "청크 전사", ar: "نسخ الجزء" },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("scribe_lang");
    return (saved as Language) || "ru";
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("scribe_lang", l);
  }, []);

  const t = useCallback((key: string): string => {
    return T[key]?.[lang] || T[key]?.["ru"] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
