// src/components/admin/PostEditor.jsx
import React, { useState, useEffect } from 'react';
import { colors, spacing, typography, shadows, borderRadius } from '../../styles/theme';

// Componentes para el editor
import EditorHeader from './EditorHeader';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';
import PostMetadata from './PostMetadata';
import CoverImageUploader from './CoverImageUploader';
import MarkdownGuide from './MarkdownGuide';
import StatusMessage from './StatusMessage';
import ImportExportActions from './ImportExportActions';

// Funciones para almacenamiento local
const savePostToLocalStorage = (post) => {
  try {
    const postToSave = { ...post };
    // No guardamos la imagen como tal, sino solo la URL de vista previa
    delete postToSave.coverImage;
    localStorage.setItem('post_draft', JSON.stringify(postToSave));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadPostFromLocalStorage = () => {
  try {
    const savedPost = localStorage.getItem('post_draft');
    return savedPost ? JSON.parse(savedPost) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

const PostEditor = () => {
  const [post, setPost] = useState({
    title: '',
    category: '',
    content: '',
    tags: '',
    coverImage: null,
    coverImagePreview: null,
    status: 'draft', // 'draft', 'published'
    publishDate: new Date().toISOString().slice(0, 10),
  });

  const [activeTab, setActiveTab] = useState('write'); // 'write' o 'preview'
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Categorías disponibles
  const categories = [
    'Noticias',
    'Técnicas de Estudio',
    'Problemáticas',
    'Educación de Calidad',
    'Herramientas',
    'Desarrollo Docente',
    'Comunidad'
  ];

  // Manejador para cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPost(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejador para cambios en la imagen de portada
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPost(prev => ({
        ...prev,
        coverImage: file,
        coverImagePreview: URL.createObjectURL(file)
      }));
    }
  };

  // Autoguardado cuando el contenido cambia
  useEffect(() => {
    const timer = setTimeout(() => {
      if (post.content.length > 0 || post.title.length > 0) {
        console.log('Guardado automático...');
        savePostToLocalStorage(post);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [post.content, post.title]);
  
  // Cargar borrador guardado al iniciar
  useEffect(() => {
    const savedPost = loadPostFromLocalStorage();
    if (savedPost) {
      setPost(savedPost);
    }
  }, []);

  // Simular guardar como borrador
  const saveDraft = () => {
    setIsSaving(true);
    
    // Guardar en localStorage
    savePostToLocalStorage(post);
    
    // Simulación de guardado
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage({
        type: 'success',
        text: 'Borrador guardado correctamente',
        icon: '✓'
      });
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSaveMessage(null), 3000);
    }, 1000);
  };

  // Simular publicación del post
  const publishPost = () => {
    // Validación básica
    if (!post.title.trim() || !post.content.trim() || !post.category) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor completa al menos el título, categoría y contenido del post',
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    
    setIsPublishing(true);
    
    // Simulación de publicación
    setTimeout(() => {
      setIsPublishing(false);
      setPost(prev => ({ ...prev, status: 'published' }));
      setSaveMessage({
        type: 'success',
        text: '¡Post publicado correctamente!',
        icon: '🎉'
      });
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSaveMessage(null), 3000);
      
      // Limpieza del borrador en localStorage después de publicar
      localStorage.removeItem('post_draft');
    }, 1500);
  };

  // Exportar el post a Markdown para descargar
  const exportToMarkdown = () => {
    // Crear un objeto de texto para descargar
    const frontMatter = `---
title: ${post.title}
category: ${post.category}
tags: ${post.tags}
date: ${post.publishDate}
status: ${post.status}
---

`;
    
    const markdown = frontMatter + post.content;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace de descarga y hacer clic en él
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Mostrar mensaje de éxito
    setSaveMessage({
      type: 'success',
      text: 'Archivo Markdown descargado correctamente',
      icon: '📥'
    });
    
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Importar un archivo Markdown
  const importMarkdown = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      
      // Parsear el frontmatter si existe
      let postData = { content };
      
      const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
      const match = content.match(frontMatterRegex);
      
      if (match) {
        const frontMatter = match[1];
        const actualContent = content.replace(frontMatterRegex, '');
        
        // Extraer metadatos del frontmatter
        const titleMatch = frontMatter.match(/title:\s*(.*)/);
        const categoryMatch = frontMatter.match(/category:\s*(.*)/);
        const tagsMatch = frontMatter.match(/tags:\s*(.*)/);
        const dateMatch = frontMatter.match(/date:\s*(.*)/);
        const statusMatch = frontMatter.match(/status:\s*(.*)/);
        
        postData = {
          title: titleMatch ? titleMatch[1] : '',
          category: categoryMatch ? categoryMatch[1] : '',
          tags: tagsMatch ? tagsMatch[1] : '',
          publishDate: dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10),
          status: statusMatch ? statusMatch[1] : 'draft',
          content: actualContent.trim()
        };
      } else {
        // Si no hay frontmatter, usar todo como contenido
        postData.content = content;
      }
      
      // Actualizar el estado del post 
      setPost(prevPost => ({
        ...prevPost,
        ...postData
      }));
      
      // Mostrar mensaje de éxito
      setSaveMessage({
        type: 'success',
        text: 'Archivo Markdown importado correctamente',
        icon: '📤'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    };
    
    reader.readAsText(file);
  };

  // Estilos CSS
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: `${spacing.xl} ${spacing.md}`,
      fontFamily: typography.fontFamily
    },
    editorContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 300px",
      gap: spacing.xl,
      marginBottom: spacing.xxl,
      '@media (max-width: 768px)': {
        gridTemplateColumns: "1fr"
      }
    },
    mainEditor: {
      width: "100%",
      maxWidth: "800px" // Anchura predefinida para el contenido del post
    },
    sidebar: {},
    formGroup: {
      marginBottom: spacing.lg
    },
    tabsContainer: {
      display: "flex",
      marginBottom: spacing.md,
      borderBottom: `1px solid ${colors.gray200}`,
      position: "relative",
      zIndex: 1
    },
    tab: {
      padding: `${spacing.sm} ${spacing.xl}`,
      cursor: "pointer",
      border: "none",
      background: "none",
      fontWeight: typography.fontWeight.medium,
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      position: "relative",
      transition: "all 0.3s ease",
      borderRadius: `${borderRadius.md} ${borderRadius.md} 0 0`
    },
    activeTabStyle: {
      color: colors.primary,
      backgroundColor: colors.white,
      boxShadow: `0 -2px 4px rgba(0,0,0,0.05)`,
      position: 'relative'
    }
  };

  return (
    <div style={styles.container}>
      {/* Estilos CSS en línea para animaciones */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
        `
      }} />

      <EditorHeader 
        postStatus={post.status}
        isSaving={isSaving}
        isPublishing={isPublishing}
        onSaveDraft={saveDraft}
        onPublish={publishPost}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: spacing.xl,
        marginBottom: spacing.xxl,
        '@media (max-width: 768px)': {
          gridTemplateColumns: "1fr"
        }
      }}>
        <div style={styles.mainEditor}>
          <div style={styles.formGroup}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              marginBottom: spacing.xs,
              fontWeight: typography.fontWeight.medium,
              color: colors.primary
            }} htmlFor="title">
              <span style={{color: colors.primary, fontSize: '1.1em'}}>📝</span> Título del post
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={post.title}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: spacing.md,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.gray200}`,
                fontSize: typography.fontSize.lg,
                transition: "all 0.3s ease",
                marginBottom: spacing.md,
                fontWeight: typography.fontWeight.semiBold,
                borderLeft: `4px solid ${colors.primary}`
              }}
              placeholder="Escribe un título atractivo"
              onFocus={(e) => {
                e.target.style.boxShadow = `0 0 0 2px ${colors.primary}30`;
                e.target.style.borderLeft = `4px solid ${colors.secondary}`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderLeft = `4px solid ${colors.primary}`;
              }}
            />
          </div>

          <div style={styles.formGroup}>
            <div style={styles.tabsContainer}>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'write' ? styles.activeTabStyle : {})
                }}
                onClick={() => setActiveTab('write')}
              >
                Code
                {activeTab === 'write' && (
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'white'
                  }}></span>
                )}
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'preview' ? styles.activeTabStyle : {})
                }}
                onClick={() => setActiveTab('preview')}
              >
                Preview
                {activeTab === 'preview' && (
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'white'
                  }}></span>
                )}
              </button>
              <div style={{
                flex: 1,
                borderBottom: `1px solid ${colors.gray200}`,
                marginBottom: '-1px'
              }}></div>
            </div>
            
            {activeTab === 'write' ? (
              <MarkdownEditor 
                content={post.content} 
                onChange={handleChange} 
              />
            ) : (
              <MarkdownPreview content={post.content} />
            )}
          </div>

          {saveMessage && (
            <StatusMessage 
              type={saveMessage.type} 
              text={saveMessage.text} 
              icon={saveMessage.icon} 
            />
          )}
        </div>

        <div style={styles.sidebar}>
          <CoverImageUploader 
            coverImagePreview={post.coverImagePreview} 
            onChange={handleImageChange} 
          />

          <PostMetadata 
            post={post} 
            categories={categories} 
            onChange={handleChange} 
          />

          <MarkdownGuide />
          
          <ImportExportActions 
            onExport={exportToMarkdown} 
            onImport={importMarkdown} 
          />
        </div>
      </div>
    </div>
  );
};

export default PostEditor;