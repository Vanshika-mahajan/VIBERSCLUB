import numpy as np
DX,DY,W,H,T=1.46,-3.295,2.84,6.18,0.2
leafW=W*0.985
def proj(u,v,th,C):
    X=DX-W/2+u*np.cos(th); Y=DY+H/2+v; Z=0.01+T+0.01-u*np.sin(th)
    k=C[2]/(C[2]-Z)
    x=C[0]+(X-C[0])*k; y=C[1]+(Y-C[1])*k
    return x*100+836, 470.5-y*100
if __name__=='__main__':
    for cx in (0,0.6,1.46):
        C=(cx,0,12.92)
        for a in (0.3,0.35,0.42,0.5):
            th=1.75*a
            print(cx,a,[tuple(round(t) for t in proj(u,v,th,C)) for u,v in [(0,H*.498),(leafW,H*.498),(leafW,-H*.498),(0,-H*.498)]])
