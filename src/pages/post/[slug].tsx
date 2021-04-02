import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useMemo, useEffect } from 'react';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismisc from '@prismicio/client';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';

import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';
import { UtterancesComments } from '../../components/Coments';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

interface reduceProps {
  soma: number;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  function calcularTempoLeitura(content: Post['data']['content']) {
    const qtdPalavras = content.reduce((acc, item) => {
      if (!acc.soma) {
        acc.soma = 0;
      }
      acc.soma = item.heading.split(' ').length + acc.soma;

      const qtdPalavrasBody = item.body.reduce((acc2, subitem) => {
        if (!acc2.soma) {
          acc2.soma = 0;
        }
        acc2.soma = subitem.text.split(' ').length + acc2.soma;
        return acc2;
      }, {} as reduceProps);
      acc.soma = Number(acc.soma) + qtdPalavrasBody.soma;

      return acc;
    }, {} as reduceProps);

    return Math.ceil(qtdPalavras.soma / 200);
  }

  const postFormatted = useMemo(() => {
    return {
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd LLL yyyy',
        {
          locale: ptBR,
        }
      ),

      data: {
        title: post.data.title,
        banner: post.data.banner,
        author: post.data.author,

        content: post.data.content.map(item => ({
          ...item,
          itemFormatted: RichText.asHtml(item.body),
        })),
      },
    };
  }, [post]);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Header />
      <img
        className={styles.banner}
        src={postFormatted.data.banner.url}
        alt=""
      />
      <main className={commonStyles.container}>
        <div className={styles.postHeader}>
          <strong>{postFormatted.data.title}</strong>
          <div>
            <div>
              <FiCalendar />
              {postFormatted.first_publication_date}
            </div>
            <div>
              <FiUser />
              {postFormatted.data.author}
            </div>
            <div>
              <FiClock />
              {`${calcularTempoLeitura(post.data.content)} min`}
            </div>
          </div>
        </div>

        <div className={styles.postContent}>
          {postFormatted.data.content.map((content, i) => (
            <div key={content.heading}>
              <h4>{content.heading}</h4>
              <div
                dangerouslySetInnerHTML={{ __html: content.itemFormatted }}
              />
            </div>
          ))}
        </div>
        <UtterancesComments/>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsPagination = await prismic.query(
    [Prismisc.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 100,
    }
  );
  const slug = postsPagination?.results?.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths: slug,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    lang: 'pt-BR',
  });

  const post = {
    first_publication_date: response.first_publication_date,
    ...response,

    data: {
      ...response.data,
      title: response.data.title,
      banner: response.data.banner,
      author: response.data.author,

      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24, // 1 dia
  };
};
