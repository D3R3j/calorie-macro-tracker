# Инструменты разработки и применимость

Внешние инструкции используются как справочники. Требования приложения и пользователя имеют приоритет. Установка навыка не означает, что его сторонние сервисы, зависимости или команды применяются к приложению.

## Основные источники

- [mattpocock/skills](https://github.com/mattpocock/skills): `grill-me`, `grilling`, `tdd`, `improve-codebase-architecture`, `codebase-design`, `handoff`.
- [openai/skills](https://github.com/openai/skills): `gh-fix-ci`.
- [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser): `agent-browser`; сам навык установлен, отдельный браузерный CLI не подключался. Реальная проверка интерфейса выполнена доступным браузерным инструментом.
- [anthropics/skills](https://github.com/anthropics/skills) и [android/skills](https://github.com/android/skills): ранее установленные `frontend-design` и `android-cli`.
- [rcosteira79/android-skills](https://github.com/rcosteira79/android-skills): пакет Android/Kotlin/Compose, 21 навык.
- [Dimillian/Skills](https://github.com/Dimillian/Skills): 16 навыков iOS, обзора изменений и разработки. Для текущего Java-приложения применимы общие рекомендации по проверке кода; SwiftUI и Xcode не используются.
- [ceorkm/mobile-app-ui-design](https://github.com/ceorkm/mobile-app-ui-design): мобильная навигация, иерархия действий, пустые состояния, адаптивность.
- [liuyi0808/android-review](https://github.com/liuyi0808/android-review): 7 навыков анализа Android. Проверены относящиеся к приложению правила WebView, файлов и ресурсов. Полный аудит Google Play не заявляется: APK распространяется через GitHub.
- [zaferayan/skills](https://github.com/zaferayan/skills): справочник Expo установлен для будущих проектов. Реклама, платный экран, PostHog и смена стека в это приложение не добавлялись.

Дополнительные коллекции рассматриваются по применимости к текущему стеку. Одинаковые навыки из сборников не заменяют уже установленные оригиналы.

## Уточнения

`grill-me` в установленной версии запускает интервью по проектным решениям; это не автоматический сканер кода. Ошибки текущего изменения искались отдельным чтением кода, воспроизведением, тестами и проверкой браузера/эмулятора.

`gh-fix-ci` применяется при реальном сбое GitHub Actions. Последние проверки перед выпуском были успешны; искусственных исправлений CI не делалось.

[Mobile Canvas](https://github.com/Redth/mobile-canvas-ghcp) 0.1.18 установлен как отдельная Windows-программа с проверкой SHA-256 официального выпуска. Расширение Copilot/VS Code и дополнительный MCP-сервер не регистрировались.

[Callstack Mobile Dev](https://github.com/callstackincubator/codex-mobile-dev-plugin) не установлен: готовый плагин рассчитан на Codex на Apple Silicon Mac. На Windows использованы установленный Android CLI и Android Device Hub.

`vibecode-cli` отменён пользователем: программа и созданный навык удалены. Его облачные проекты и сборки не запускались. Исходники и APK публикуются только в `D3R3j/calorie-macro-tracker`.
