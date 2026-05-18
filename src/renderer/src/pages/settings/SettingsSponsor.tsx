import { useState } from 'react';
import wxSponsorImg from '@renderer/assets/imgs/wx_sponsor.png'

type Platform = {
  label: string
  desc: string
  icon: string
  color: string
  url?: string
  qrPlaceholder?: boolean
}

const SPONSOR_PLATFORMS: Platform[] = [
  // {
  //   label: 'GitHub Sponsors',
  //   desc: '通过 GitHub 赞助支持项目开发',
  //   url: 'https://github.com/sponsors/ZHL',
  //   icon: 'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z',
  //   color: 'from-gray-800 to-gray-700 dark:from-gray-600 dark:to-gray-500',
  // },
  // {
  //   label: '爱发电',
  //   desc: '国内赞助平台，支持支付宝/微信支付',
  //   url: 'https://afdian.com/a/ZHL',
  //   icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  //   color: 'from-pink-500 to-rose-600',
  // },
  {
    label: '微信赞赏',
    desc: '扫描二维码微信赞赏支持',
    qrPlaceholder: true,
    icon: 'M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14zM12 6a2 2 0 11.001 3.999A2 2 0 0112 6zm-4 8c0-2.21 1.79-4 4-4s4 1.79 4 4',
    color: 'from-green-500 to-emerald-600',
  },
]

const BENEFITS = [
  { icon: '⭐', title: '优先反馈', desc: '赞助者可获得 Bug 修复和功能请求的优先响应' },
  { icon: '💬', title: '专属交流群', desc: '加入内部讨论组，参与项目方向决策' },
  { icon: '📜', title: '致谢名单', desc: '您的名字将出现在项目致谢列表中' },
  { icon: '🚀', title: '加速开发', desc: '您的支持让项目获得更多开发时间和资源投入' },
]

export default function SettingsSponsor() {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">赞助支持</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">让好项目走得更远</p>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <h4 className="text-xl font-bold text-gray-900 dark:text-white">支持 Agent Flow</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 max-w-md mx-auto leading-relaxed">
          本项目采用非商业许可证，对个人和学习的用途完全免费。
          如果这个项目对您有帮助，欢迎赞助支持，让项目能持续发展。
        </p>
      </div>

      {/* Sponsor Platforms */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">赞助方式</h4>
        <div className="space-y-3">
          {SPONSOR_PLATFORMS.map(platform => (
            <div key={platform.label}>
              {platform.qrPlaceholder ? (
                <div>
                  <div
                    onClick={() => setShowQr(!showQr)}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-md`}>
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d={platform.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {platform.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{platform.desc}</p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                      <svg className={`w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-transform duration-200 ${showQr ? 'rotate-45' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14m-7-7h14" />
                      </svg>
                    </div>
                  </div>
                  {showQr && (
                    <div className="mt-3 p-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 flex justify-center">
                      <img src={wxSponsorImg} alt="微信赞赏码" className="w-48 h-48 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-md`}>
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d={platform.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {platform.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{platform.desc}</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
                    </svg>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">赞助权益</h4>
        <div className="grid grid-cols-2 gap-2">
          {BENEFITS.map(b => (
            <div key={b.title} className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
              <span className="text-lg">{b.icon}</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1.5">{b.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500 leading-relaxed">
        赞助完全自愿，金额不限。项目始终对非商业用途保持免费开放。
      </p>
    </div>
  )
}
