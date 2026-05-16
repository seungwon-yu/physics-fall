# 캐릭터 이미지 폴더

이 폴더에 PNG 파일을 넣으면 게임 내 캐릭터가 자동으로 이미지로 표시됩니다.
파일이 없으면 색상 원형(fallback)으로 표시됩니다.

## 필요한 파일

| 레벨 | 캐릭터 | 파일명 |
|------|--------|--------|
| Lv.1 | 아미하 유네 | `lv1_amiha_yune.png` |
| Lv.2 | 하쿠텐 후와 | `lv2_hakuten_fuwa.png` |
| Lv.3 | 쇼코코 도리 | `lv3_shokoko_dori.png` |
| Lv.4 | 니우니우 | `lv4_niuniu.png` |
| Lv.5 | 오단밍 | `lv5_odanming.png` |
| Lv.6 | 햄쿠비 | `lv6_hamkubi.png` |
| Lv.7 | 야토 | `lv7_yato.png` |

## 권장 사양

- 포맷: PNG (투명 배경 권장)
- 크기: 정사각형 256×256 ~ 512×512
- 캐릭터를 중앙에 꽉 차게 배치 (원형 클리핑됨)

## 캐릭터 세트 교체

다른 캐릭터로 바꾸려면 `src/game/characters.ts`의 `stages` 배열에서
`id`, `name`, `color`, `imagePath`, `description`만 수정하면 됩니다.
물리/점수/렌더링 코드는 데이터 기반이라 그대로 동작합니다.
