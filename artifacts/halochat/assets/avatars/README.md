# Avatar Images

Drop your generated face images into this folder, then update `constants/avatars.ts`.

## Naming convention
- Female: `f1.jpg`, `f2.jpg`, `f3.jpg`, `f4.jpg`
- Male:   `m1.jpg`, `m2.jpg`, `m3.jpg`, `m4.jpg`

## How to wire them up
In `constants/avatars.ts`, uncomment and replace the `source: null` lines:

```ts
{ id: "f1", ..., source: require("../assets/avatars/f1.jpg") },
```

## Recommended specs
- Square crop, 512×512 or 1024×1024
- Face centered, neutral/soft expression
- JPEG or PNG
