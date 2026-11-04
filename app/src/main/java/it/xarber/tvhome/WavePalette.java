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
        int first=-1;for(int i=0;i<64;i++)if(votes[i]>0&&(first<0||votes[i]>votes[first]))first=i;if(first<0)return;
        int[] average=new int[64];for(int i=0;i<64;i++)if(votes[i]>0)average[i]=Color.rgb((int)(red[i]/votes[i]),(int)(green[i]/votes[i]),(int)(blue[i]/votes[i]));
        int second=first;double best=0;for(int i=0;i<64;i++)if(votes[i]>0){int d=distance(average[first],average[i]);double score=votes[i]*Math.sqrt(d);if(d>3500&&score>best){best=score;second=i;}}
        int primary=0;for(int i=0;i<count;i++)if(distance(samples[i],average[first])<=distance(samples[i],average[second]))primary++;
        weight=first==second?.92:Math.max(.5,Math.min(.92,primary/(double)Math.max(1,count)));
        colors[0]=average[first];colors[1]=average[second];
    }
}
