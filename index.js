
const { spawnSync, spawn } = require( child_process )
const { existsSync, writeFileSync } = require( fs )
const path = require( path )

// إعدادات البوت
const SESSION_ID = 'levanter_1f42a3441da1a456493a7af6ea724a97b'  // ضع هنا معرف الجلسة بين علامتي التنصيص

// متغيرات التحكم بإعادة التشغيل
let nodeRestartCount = 0
const maxNodeRestarts = 5
const restartWindow = 30000 // 30 ثانية
let lastRestartTime = Date.now()

/**
 * تشغيل البوت باستخدام Node.js مباشرة
 */
function startNode() {
  console.log( 🔵 بدء تشغيل البوت باستخدام Node.js... )
  const child = spawn( node , [ index.js ], { cwd:  levanter , stdio:  inherit  })

  child.on( exit , (code) => {
    if (code !== 0) {
      const currentTime = Date.now()
      if (currentTime - lastRestartTime > restartWindow) {
        nodeRestartCount = 0
      }
      lastRestartTime = currentTime
      nodeRestartCount++

      if (nodeRestartCount > maxNodeRestarts) {
        console.error( ⛔ توقف: البوت يعيد التشغيل باستمرار. يرجى التحقق من الأخطاء. )
        return
      }
      console.log(
        `🔄 الكود الخروج: ${code} | جارِ إعادة التشغيل... (المحاولة ${nodeRestartCount}/${maxNodeRestarts})`
      )
      startNode()
    }
  })
}

/**
 * تشغيل البوت باستخدام PM2
 */
function startPm2() {
  console.log( 🟢 محاولة التشغيل باستخدام PM2... )
  const pm2 = spawn( yarn , [ pm2 ,  start ,  index.js ,  --name ,  levanter ,  --attach ], {
    cwd:  levanter ,
    stdio: [ pipe ,  pipe ,  pipe ],
  })

  let restartCount = 0
  const maxRestarts = 5

  pm2.on( exit , (code) => {
    if (code !== 0) {
      console.log( 🔶 الانتقال إلى وضع Node.js المباشر... )
      startNode()
    }
  })

  pm2.on( error , (error) => {
    console.error(`❌ خطأ PM2: ${error.message}`)
    startNode()
  })

  // مراقبة عمليات إعادة التشغيل التلقائية
  if (pm2.stderr) {
    pm2.stderr.on( data , (data) => {
      const output = data.toString()
      if (output.includes( restart )) {
        restartCount++
        if (restartCount > maxRestarts) {
          console.log( ⚠️ اكتشاف عمليات إعادة تشغيل متكررة في PM2 )
          spawnSync( yarn , [ pm2 ,  delete ,  levanter ], { cwd:  levanter , stdio:  inherit  })
          startNode()
        }
      }
    })
  }

  if (pm2.stdout) {
    pm2.stdout.on( data , (data) => {
      const output = data.toString()
      console.log(output)
      if (output.includes( Connecting )) {
        console.log( ✅ اتصال ناجح بالخادم )
        restartCount = 0
      }
    })
  }
}

/**
 * تثبيت جميع التبعيات المطلوبة
 */
function installDependencies() {
  console.log( 📦 جارٍ تثبيت جميع التبعيات... )
  const installResult = spawnSync(
     yarn ,
    [ install ,  --force ,  --non-interactive ,  --network-concurrency ,  3 ],
    {
      cwd:  levanter ,
      stdio:  inherit ,
      env: { ...process.env, CI:  true  },
    }
  )

  if (installResult.error || installResult.status !== 0) {
    console.error(
      `❌ فشل التثبيت: ${installResult.error ? installResult.error.message :  خطأ غير معروف }`
    )
    process.exit(1)
  }
  console.log( ✔ تم تثبيت التبعيات بنجاح )
}

/**
 * فحص التبعيات المثبتة
 */
function checkDependencies() {
  console.log( 🔍 جارٍ فحص التبعيات... )
  if (!existsSync(path.resolve( levanter/package.json ))) {
    console.error( ❌ ملف package.json غير موجود! )
    process.exit(1)
  }

  const result = spawnSync( yarn , [ check ,  --verify-tree ], {
    cwd:  levanter ,
    stdio:  inherit ,
  })

  if (result.status !== 0) {
    console.log( ⚠️ يوجد مشاكل في التبعيات، جارٍ إعادة التثبيت... )
    installDependencies()
  } else {
    console.log( ✓ جميع التبعيات صحيحة ومثبتة )
  }
}

/**
 * تنزيل وتجهيز البوت لأول مرة
 */
function setupBot() {
  console.log( ⚙️ بدء إعداد البوت لأول مرة... )
  
  console.log( ⏬ جارٍ تنزيل الملفات من GitHub... )
  const cloneResult = spawnSync(
     git ,
    [ clone ,  https://github.com/lyfe00011/levanter.git ,  levanter ],
    {
      stdio:  inherit ,
    }
  )

  if (cloneResult.error) {
    console.error(`❌ فشل التنزيل: ${cloneResult.error.message}`)
    process.exit(1)
  }

  const configPath =  levanter/config.env 
  try {
    console.log( 🛠 جارٍ إنشاء ملف الإعدادات... )
    writeFileSync(configPath, `VPS=true\nSESSION_ID=${SESSION_ID}`)
    console.log( ✔ تم إنشاء ملف الإعدادات بنجاح )
  } catch (err) {
    console.error(`❌ فشل إنشاء الإعدادات: ${err.message}`)
    process.exit(1)
  }

  installDependencies()
}

// البداية الفعلية للتشغيل
console.log( 🌟 بدء تشغيل نظام البوت... )

if (!existsSync( levanter )) {
  console.log( 🆕 لم يتم العثور على البوت، جارٍ التثبيت لأول مرة... )
  setupBot()
  checkDependencies()
} else {
  console.log( 🔄 تم العثور على البوت، جارٍ التحقق... )
  checkDependencies()
}

console.log( 🚀 بدء تشغيل البوت... )
startPm2()

// رسائل التحذير والإخطار
process.on( uncaughtException , (err) => {
  console.error(`‼️ خطأ غير متوقع: ${err.message}`)
})

process.on( unhandledRejection , (reason) => {
  console.error(`‼️ تم رفض عملية بدون معالجة: ${reason}`)
})
