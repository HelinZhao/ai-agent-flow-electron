; 安装时从安装程序同级目录复制用户资源包
!macro customInstall
  ; 复制 ollama/
  IfFileExists "$EXEDIR\ollama\*.*" 0 ollama_end
    CreateDirectory "$INSTDIR\resources\ollama"
    CopyFiles /SILENT "$EXEDIR\ollama\*.*" "$INSTDIR\resources\ollama"
  ollama_end:

  ; 复制 models/
  IfFileExists "$EXEDIR\models\*.*" 0 models_end
    CreateDirectory "$INSTDIR\resources\models"
    CopyFiles /SILENT "$EXEDIR\models\*.*" "$INSTDIR\resources\models"
  models_end:
!macroend
