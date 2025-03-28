// src/components/admin/SyntaxHighlighter.jsx
import React, { useEffect, useRef } from 'react';

const SyntaxHighlighter = ({ content, onChange, textAreaRef }) => {
  const highlighterRef = useRef(null);
  const containerRef = useRef(null);
  
  // Sincronizar scroll entre el textArea y el resaltador
  const syncScroll = () => {
    if (highlighterRef.current && textAreaRef.current) {
      highlighterRef.current.scrollTop = textAreaRef.current.scrollTop;
      highlighterRef.current.scrollLeft = textAreaRef.current.scrollLeft;
    }
  };

  // Actualizar el contenido resaltado cuando cambia el contenido
  useEffect(() => {
    if (highlighterRef.current && textAreaRef.current) {
      try {
        // Simplemente escapar HTML - sin añadir clases o modificar el texto
        const escapedContent = escapeHtml(content);
        highlighterRef.current.innerHTML = createDivs(escapedContent);
        
        // Configurar event listeners
        textAreaRef.current.addEventListener('scroll', syncScroll);
        
      } catch (error) {
        console.error("Error applying syntax highlighting:", error);
      }
      
      // Limpiar event listeners
      return () => {
        if (textAreaRef.current) {
          textAreaRef.current.removeEventListener('scroll', syncScroll);
        }
      };
    }
  }, [content]);

  // Función para escapar HTML de forma segura
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  
  // Crear divs para cada línea, manteniendo líneas vacías
  const createDivs = (html) => {
    const lines = html.split('\n');
    return lines.map(line => `<div>${line || "&nbsp;"}</div>`).join('');
  };

  // Manejar cambios en el texto
  const handleChange = (e) => {
    onChange(e);
  };

  // Manejar eventos de teclado (Tab, Enter, etc.)
  const handleKeyDown = (e) => {
    // Implementar tabulación personalizada con 2 espacios
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      // Obtener el valor del textarea
      const value = e.target.value;
      
      // Insertar 2 espacios en la posición actual
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      // Establecer el nuevo valor
      e.target.value = newValue;
      
      // Mover el cursor después de los espacios insertados
      e.target.selectionStart = e.target.selectionEnd = start + 2;
      
      // Disparar evento de cambio
      const event = {
        target: {
          name: 'content',
          value: newValue
        }
      };
      handleChange(event);
    }
  };

  const styles = {
    container: {
      position: 'relative',
      width: '100%',
      height: '600px',
      fontSize: '14px',
      lineHeight: 1.5,
      overflow: 'hidden',
      borderRadius: '8px',
      border: '1px solid #e1e4e8'
    },
    highlighter: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      padding: '16px',
      backgroundColor: '#1e1e1e',
      color: '#E34C26', // Color para HTML
      fontFamily: "'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: '14px',
      lineHeight: 1.5,
      overflow: 'auto',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      zIndex: 1
    },
    textarea: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      padding: '16px',
      color: 'transparent',
      caretColor: '#f8f8f8',
      backgroundColor: 'transparent',
      fontFamily: "'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: '14px',
      lineHeight: 1.5,
      border: 'none',
      resize: 'none',
      whiteSpace: 'pre',
      overflow: 'auto',
      outline: 'none',
      zIndex: 2
    }
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Estilos para el resaltado */}
      <style dangerouslySetInnerHTML={{ __html: `
        .syntax-highlight-editor {
          counter-reset: line;
          padding-left: 60px;
        }
        
        .syntax-highlight-editor div {
          position: relative;
          min-height: 1.5em;
        }
        
        .syntax-highlight-editor div:before {
          content: counter(line);
          counter-increment: line;
          position: absolute;
          left: -50px;
          top: 0;
          width: 40px;
          color: #636d83;
          text-align: right;
          user-select: none;
          opacity: 0.5;
        }
      ` }} />
      
      {/* Capa de resaltado (solo visual) */}
      <pre 
        ref={highlighterRef}
        className="syntax-highlight-editor"
        style={styles.highlighter}
      />
      
      {/* Textarea para edición (visible pero con texto transparente) */}
      <textarea
        ref={textAreaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        style={styles.textarea}
        spellCheck="false"
        placeholder="Escribe o pega tu código HTML aquí..."
      />
    </div>
  );
};

export default SyntaxHighlighter;