/* From Uiverse.io by mobinkakei - https://uiverse.io/mobinkakei/grumpy-turtle-41
   MIT License, Copyright (c) mobinkakei (Mobeen) */

// Classes renommées en préfixe `skl-` pour éviter toute collision,
// balles recolorées en vert SOUKEYNA.
const CSS = `
.skl-wrap{width:200px;height:60px;position:relative;z-index:1}
.skl-circle{width:20px;height:20px;position:absolute;border-radius:50%;background:var(--color-vert);left:15%;transform-origin:50%;animation:skl-circle .5s alternate infinite ease}
@keyframes skl-circle{
0%{top:60px;height:5px;border-radius:50px 50px 25px 25px;transform:scaleX(1.7)}
40%{height:20px;border-radius:50%;transform:scaleX(1)}
100%{top:0%}
}
.skl-circle:nth-child(2){left:45%;animation-delay:.2s}
.skl-circle:nth-child(3){left:auto;right:15%;animation-delay:.3s}
.skl-shadow{width:20px;height:4px;border-radius:50%;background:rgba(0,0,0,.9);position:absolute;top:62px;transform-origin:50%;z-index:-1;left:15%;filter:blur(1px);animation:skl-shadow .5s alternate infinite ease}
@keyframes skl-shadow{
0%{transform:scaleX(1.5)}
40%{transform:scaleX(1);opacity:.7}
100%{transform:scaleX(.2);opacity:.4}
}
.skl-shadow:nth-child(4){left:45%;animation-delay:.2s}
.skl-shadow:nth-child(5){left:auto;right:15%;animation-delay:.3s}
`;

export function LoaderBalles() {
  return (
    <>
      <style>{CSS}</style>
      <div className="skl-wrap" role="status" aria-label="Chargement en cours">
        <div className="skl-circle" />
        <div className="skl-circle" />
        <div className="skl-circle" />
        <div className="skl-shadow" />
        <div className="skl-shadow" />
        <div className="skl-shadow" />
      </div>
    </>
  );
}
