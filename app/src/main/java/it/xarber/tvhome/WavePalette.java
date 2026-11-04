// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;
import android.graphics.Bitmap;
import android.graphics.Color;
/** One palette for Home, activities and remote; dominance reflects sampled cover area. */
final class WavePalette {
    private static Bitmap previous;private static int[] colors={0xffe6eaf0,0xff929aa8};private static double weight=.72;
    static synchronized int[] from(Bitmap artwork){update(artwork);return colors.clone();}
    static synchronized double dominance(Bitmap artwork){update(artwork);return weight;}
    private static int distance(int a,int b){int r=Color.red(a)-Color.red(b),g=Color.green(a)-Color.green(b),bl=Color.blue(a)-Color.blue(b);return r*r+g*g+bl*bl;}
    private static void update(Bitmap artwork){if(artwork==previous)return;previous=artwork;colors=new int[]{0xffe6eaf0,0xff929aa8};weight=.72;if(artwork==null||artwork.isRecycled())return;
        long[] red=new long[64],green=new long[64],blue=new long[64];int[] votes=new int[64],samples=new int[576];int count=0;
        for(int y=0;y<24;y++)for(int x=0;x<24;x++){int c=artwork.getPixel(Math.min(artwork.getWidth()-1,(2*x+1)*artwork.getWidth()/48),Math.min(artwork.getHeight()-1,(2*y+1)*artwork.getHeight()/48));if(Color.alpha(c)<128)continue;int r=Color.red(c),g=Color.green(c),b=Color.blue(c),bin=((r>>6)<<4)|((g>>6)<<2)|(b>>6);votes[bin]++;red[bin]+=r;green[bin]+=g;blue[bin]+=b;samples[count++]=c;}
        if(count==0)return;
        int[] average=new int[64];for(int i=0;i<64;i++)if(votes[i]>0)average[i]=Color.rgb((int)(red[i]/votes[i]),(int)(green[i]/votes[i]),(int)(blue[i]/votes[i]));
        // Merge nearby shades before ranking by area. Contrast must never promote a tiny accent.
        int first=-1,bestMass=0;for(int i=0;i<64;i++)if(votes[i]>0){int mass=0;for(int j=0;j<64;j++)if(votes[j]>0&&distance(average[i],average[j])<6400)mass+=votes[j];if(mass>bestMass){bestMass=mass;first=i;}}
        long r=0,g=0,b=0;int mass=0;boolean[] used=new boolean[64];for(int j=0;j<64;j++)if(votes[j]>0&&distance(average[first],average[j])<6400){used[j]=true;r+=red[j];g+=green[j];b+=blue[j];mass+=votes[j];}
        colors[0]=Color.rgb((int)(r/mass),(int)(g/mass),(int)(b/mass));
        int second=-1,secondMass=0;for(int i=0;i<64;i++)if(votes[i]>0&&!used[i]){int total=0;for(int j=0;j<64;j++)if(!used[j]&&votes[j]>0&&distance(average[i],average[j])<6400)total+=votes[j];if(total>secondMass){secondMass=total;second=i;}}
        colors[1]=colors[0];if(second>=0){r=0;g=0;b=0;int n=0;for(int j=0;j<64;j++)if(!used[j]&&votes[j]>0&&distance(average[second],average[j])<6400){r+=red[j];g+=green[j];b+=blue[j];n+=votes[j];}colors[1]=Color.rgb((int)(r/n),(int)(g/n),(int)(b/n));}
        weight=second<0?.92:Math.max(.5,Math.min(.92,mass/(double)(mass+secondMass)));
    }
}
