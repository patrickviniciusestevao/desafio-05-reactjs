import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Primisc from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useMemo, useState } from 'react';
import Header from '../components/Header';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<PostPagination>(postsPagination);
  const [urlNextPage, setUrlNextPage] = useState(postsPagination.next_page);

  const postFormatted = useMemo(() => {
    return posts.results.map(post => {
      const formattedDate = format(
        new Date(post.first_publication_date),
        'dd LLL yyyy',
        {
          locale: ptBR,
        }
      );

      return { ...post, formattedDate };
    });
  }, [posts]);

  function handleNextPage() {
    if (!urlNextPage) {
      return;
    }

    fetch(urlNextPage)
      .then(response => response.json())
      .then(data => {
        setUrlNextPage(data.next_page);
        setPosts({
          ...data,
          results: [...posts.results, ...data.results],
        });
      });
  }

  return (
    <>
      <Header />
      <main className={commonStyles.container}>
        {postFormatted.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <a className={styles.post}>
              <strong>{post.data.title}</strong>
              <p>{post.data.subtitle}</p>

              <footer>
                <div>
                  <FiCalendar />
                  {post.formattedDate}
                </div>
                <div>
                  <FiUser />
                  {post.data.author}
                </div>
              </footer>
            </a>
          </Link>
        ))}
        {posts.next_page && (
          <button
            className={styles.nextPost}
            type="button"
            onClick={handleNextPage}
          >
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsPagination = await prismic.query(
    [Primisc.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 1,
    }
  );

  const results = postsPagination?.results?.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: { postsPagination: { ...postsPagination, results } },
  };
};
