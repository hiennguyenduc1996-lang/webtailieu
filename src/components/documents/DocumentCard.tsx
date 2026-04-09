import React from 'react';
import { Document } from '@/src/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ExternalLink, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface DocumentCardProps {
  doc: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => {
  const [imgError, setImgError] = React.useState(false);

  const isNew = new Date().getTime() - new Date(doc.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isHot = doc.title.toLowerCase().includes('đề thi') || doc.title.toLowerCase().includes('chuyên');

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'specialized': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'provincial': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'thematic': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card className="overflow-hidden group cursor-pointer border-none shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col bg-white rounded-2xl relative">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {isNew && (
            <span className="bg-amber text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">
              Mới update
            </span>
          )}
          {isHot && !isNew && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">
              Hot
            </span>
          )}
        </div>

        <div 
          className="relative aspect-[4/3] bg-slate-100 overflow-hidden"
          onClick={() => window.open(doc.driveLink, '_blank')}
        >
          {doc.thumbnailUrl && !imgError ? (
            <img
              src={doc.thumbnailUrl}
              alt={doc.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100">
              <FileText className="h-16 w-16 text-slate-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/40 transition-all duration-300 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
              <ExternalLink className="text-white h-6 w-6" />
            </div>
          </div>
        </div>
        
        <CardContent className="p-5 flex-grow space-y-3">
          <div className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getCategoryColor(doc.category)}`}>
            {doc.category === 'specialized' ? 'Trường Chuyên' : doc.category === 'provincial' ? 'Trường Sở' : 'Chuyên đề'}
          </div>
          
          <div className="space-y-1">
            <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-amber transition-colors text-navy">
              {doc.title}
            </h3>
            {doc.author && (
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <span className="w-4 h-[1px] bg-slate-300" />
                {doc.author}
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="px-5 py-4 pt-0 border-t border-slate-50 flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default DocumentCard;
